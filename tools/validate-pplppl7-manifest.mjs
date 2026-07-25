import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  createDefaultState,
  EXERCISE_CHALLENGES,
  EXERCISE_EMPHASES,
  EXERCISE_EQUIPMENT,
  EXERCISE_LATERALITIES,
  EXERCISE_PURPOSES,
  EXERCISE_STYLES,
  EXERCISE_SUPPORTS,
  EXERCISE_TARGETS,
  MOVEMENT_PATTERNS,
  SCHEMA_VERSION,
} from "../data.js";

const MANIFEST_PATH = "references/data/pplppl7-manifest.json";
const CONCEPT_PATH = "references/ui-concepts/ironworks-pplppl7.html";
const expectedRoutineCounts = new Map([
  ["gym-push-a", 13],
  ["gym-pull-a", 12],
  ["gym-legs-a", 13],
  ["gym-push-b", 10],
  ["gym-pull-b", 10],
  ["gym-legs-b", 12],
  ["home-base", 52],
  ["morning-push", 10],
  ["morning-pull", 10],
  ["morning-legs", 13],
]);
const expectedHomeBaseBlockCounts = new Map([
  ["core", 8],
  ["shoulder-scapula-and-spine", 9],
  ["hip-flexion-and-extension", 6],
  ["hip-rotation-and-circumduction", 10],
  ["hip-abduction-adduction-and-frontal-plane", 6],
  ["single-leg-and-pelvic-control", 7],
  ["ankle-and-lower-leg", 6],
]);
const expectedContextCounts = new Map([
  ["gym-push-a|upper-body-work", 3],
  ["gym-push-a|glute-block", 3],
  ["gym-push-a|upper-body-accessories", 4],
  ["gym-push-a|optional-coverage-rehab", 3],
  ["gym-pull-a|main", 8],
  ["gym-pull-a|optional-coverage-rehab", 4],
  ["gym-legs-a|main", 8],
  ["gym-legs-a|optional-coverage-rehab", 5],
  ["gym-push-b|main", 8],
  ["gym-push-b|optional-coverage-rehab", 2],
  ["gym-pull-b|main", 9],
  ["gym-pull-b|optional-coverage-rehan", 1],
  ["gym-legs-b|main", 9],
  ["gym-legs-b|optional-coverage-rehab", 3],
  ["morning-push|main", 10],
  ["morning-pull|main", 10],
  ["morning-legs|main", 13],
]);
const expectedDirectiveKeys = new Set([
  "pplppl7:gym-legs-a:003:alternative-01",
  "pplppl7:gym-legs-b:after-003:optional-quad-01",
  "pplppl7:gym-legs-b:001:rotation-01",
]);
const resolutionKinds = new Set([
  "existing-master",
  "alias",
  "new-master",
  "programmed-choice",
  "directive-candidates",
  "unresolved",
]);
const currentResolutionKinds = new Set(["retain", "merge", "split", "unresolved"]);
const reviewStatuses = new Set(["proposed", "needs-owner", "approved"]);
const supportedTargets = new Set([
  ...EXERCISE_TARGETS.map((option) => option.id),
  "neck",
  "feet-toes",
]);
const supportedMovements = new Set([
  ...MOVEMENT_PATTERNS.map((option) => option.id),
  "neck-movement",
  "foot-toe-control",
  "hip-extension",
  "shrug",
]);
const supportedEquipment = new Set(EXERCISE_EQUIPMENT.map((option) => option.id));
const supportedPurposes = new Set(EXERCISE_PURPOSES.map((option) => option.id));
const supportedStyles = new Set(EXERCISE_STYLES.map((option) => option.id));
const supportedLateralities = new Set(EXERCISE_LATERALITIES.map((option) => option.id));
const supportedSupports = new Set(EXERCISE_SUPPORTS.map((option) => option.id));
const supportedEmphases = new Set(EXERCISE_EMPHASES.map((option) => option.id));
const supportedChallenges = new Set(EXERCISE_CHALLENGES.map((option) => option.id));
const supportedRelations = new Set(["easier", "similar", "harder"]);
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalize(value) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function assertUnique(items, getKey, label) {
  const seen = new Set();
  for (const item of items) {
    const key = getKey(item);
    assert(typeof key === "string" && key, `${label} has a missing key`);
    assert(!seen.has(key), `${label} has duplicate key: ${key}`);
    seen.add(key);
  }
}

function assertOnlyKeys(value, allowedKeys, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  for (const key of Object.keys(value)) {
    assert(allowedKeys.has(key), `${label} contains out-of-scope field: ${key}`);
  }
}

function assertControlledList(values, allowed, label, minimum = 0, maximum = Infinity) {
  assert(Array.isArray(values), `${label} must be an array`);
  assert(values.length >= minimum && values.length <= maximum, `${label} has an invalid item count`);
  assertUnique(values.map((id) => ({ id })), (item) => item.id, label);
  for (const value of values) {
    assert(typeof value === "string" && allowed.has(value), `${label} contains an unsupported value: ${value}`);
  }
}

function assertOptionalControlled(value, allowed, label) {
  assert(typeof value === "string" && (!value || allowed.has(value)), `${label} has an unsupported value: ${value}`);
}

function assertResolution(resolution, masterIds, ownerLabel, allowedKinds) {
  assertOnlyKeys(resolution, new Set(["kind", "masterIds", "reviewStatus", "question", "note"]), `${ownerLabel} resolution`);
  assert(resolution && typeof resolution === "object", `${ownerLabel} has no resolution`);
  assert(allowedKinds.has(resolution.kind), `${ownerLabel} has invalid resolution kind: ${resolution.kind}`);
  assert(reviewStatuses.has(resolution.reviewStatus), `${ownerLabel} has invalid review status: ${resolution.reviewStatus}`);
  assert(Array.isArray(resolution.masterIds), `${ownerLabel} masterIds must be an array`);
  assertUnique(resolution.masterIds.map((id) => ({ id })), (item) => item.id, `${ownerLabel} masterIds`);
  for (const id of resolution.masterIds) {
    assert(masterIds.has(id), `${ownerLabel} references missing master: ${id}`);
  }
  if (resolution.kind === "unresolved") {
    assert(resolution.masterIds.length === 0, `${ownerLabel} unresolved resolution must have no master IDs`);
  } else {
    assert(resolution.masterIds.length > 0, `${ownerLabel} resolution must reference at least one master`);
  }
  if (["existing-master", "alias", "new-master", "retain", "merge"].includes(resolution.kind)) {
    assert(resolution.masterIds.length === 1, `${ownerLabel} ${resolution.kind} resolution must reference exactly one master`);
  }
  if (["programmed-choice", "split"].includes(resolution.kind)) {
    assert(resolution.masterIds.length >= 2, `${ownerLabel} ${resolution.kind} resolution must reference at least two masters`);
  }
  if (resolution.reviewStatus === "needs-owner") {
    assert(typeof resolution.question === "string" && resolution.question.trim(), `${ownerLabel} needs an owner question`);
  }
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
assertOnlyKeys(
  manifest,
  new Set([
    "manifestVersion",
    "stage",
    "source",
    "baseline",
    "libraryExpansion",
    "currentMasters",
    "masters",
    "sourceSubjects",
    "rawInventory",
    "programs",
    "routines",
    "editorialCorrections",
    "programReview",
    "relationships",
    "contentReview",
  ]),
  "manifest",
);
assert(manifest.manifestVersion === 1, "Unsupported PPLPPL 7 manifest version");
assert(["content-review", "approved"].includes(manifest.stage), "Slice 10E-C manifest has an invalid stage");
assertOnlyKeys(manifest.source, new Set(["path", "sha256", "lineCount"]), "source");
assertOnlyKeys(manifest.baseline, new Set(["schemaVersion", "revision", "currentMasterCount"]), "baseline");

const sourceText = readFileSync(manifest.source.path, "utf8");
const sourceLines = sourceText.split(/\r?\n/);
const sourceLineCount = sourceText.endsWith("\n") ? sourceLines.length - 1 : sourceLines.length;
const sourceHash = createHash("sha256").update(sourceText).digest("hex");
assert(manifest.source.sha256 === sourceHash, "Raw source SHA-256 does not match the manifest");
assert(manifest.source.lineCount === sourceLineCount, "Raw source line count does not match the manifest");
const conceptText = readFileSync(CONCEPT_PATH, "utf8");
for (const staleText of [
  "New 6",
  "12 slots",
  "Machine shoulder press",
  "Cable or Side-lying external rotation",
  "Barbell or Smith hip thrust",
  "Standing cable hip flexion / Psoas march",
  "Typically bottom to middle",
  "Watch linked video",
]) {
  assert(!conceptText.includes(staleText), `PPLPPL 7 concept retains stale reviewed copy: ${staleText}`);
}
for (const reviewedText of [
  "Machine overhead press",
  "Cable shoulder external rotation or Side-lying dumbbell shoulder external rotation",
  "Optional quad addition — perform after step-ups.",
  "Gym · Required · 13 slots",
  "Related work elsewhere: Home Base — Dead bug; Pull A — Pallof press; Legs B — 45° glute-biased back extension.",
  "<strong>Lengthened/bottom</strong>",
  "<span class=\"kind\">Easier</span><strong>Hip hinge</strong>",
]) {
  assert(conceptText.includes(reviewedText), `PPLPPL 7 concept is missing reviewed copy: ${reviewedText}`);
}
assert(manifest.baseline.schemaVersion === SCHEMA_VERSION, "Baseline schema version does not match current data.js");
assert(typeof manifest.baseline.revision === "string" && manifest.baseline.revision, "Baseline revision is missing");

const currentState = createDefaultState();
assert(Array.isArray(manifest.currentMasters), "currentMasters must be an array");
assert(
  manifest.currentMasters.length === manifest.baseline.currentMasterCount,
  "Every baseline master must have one disposition",
);
assertUnique(manifest.currentMasters, (item) => item.key, "currentMasters");
assertUnique(manifest.currentMasters, (item) => item.currentId, "currentMasters current IDs");

assert(Array.isArray(manifest.masters), "masters must be an array");
assertUnique(manifest.masters, (item) => item.id, "masters");
const masterIds = new Set(manifest.masters.map((master) => master.id));
const mastersById = new Map(manifest.masters.map((master) => [master.id, master]));
assertOnlyKeys(manifest.libraryExpansion, new Set(["status", "selectionRule", "items"]), "libraryExpansion");
assert(["needs-owner", "approved"].includes(manifest.libraryExpansion.status), "Invalid Library-expansion status");
assert(
  typeof manifest.libraryExpansion.selectionRule === "string" && manifest.libraryExpansion.selectionRule.trim(),
  "Library expansion needs a selection rule",
);
assert(Array.isArray(manifest.libraryExpansion.items), "Library-expansion items must be an array");
assert(manifest.libraryExpansion.items.length === 8, "Expected eight bounded Library-expansion items");
assertUnique(manifest.libraryExpansion.items, (item) => item.masterId, "Library-expansion master IDs");
const expansionMasterIds = new Set(manifest.libraryExpansion.items.map((item) => item.masterId));
for (const item of manifest.libraryExpansion.items) {
  assertOnlyKeys(
    item,
    new Set(["masterId", "gap", "rationale", "evidenceUrls", "reviewStatus"]),
    `Library-expansion item ${item.masterId}`,
  );
  assert(masterIds.has(item.masterId), `Library-expansion item references missing master: ${item.masterId}`);
  assert(typeof item.gap === "string" && item.gap.trim(), `Library-expansion item ${item.masterId} needs a named gap`);
  assert(
    typeof item.rationale === "string" && item.rationale.trim(),
    `Library-expansion item ${item.masterId} needs a selection rationale`,
  );
  assert(
    Array.isArray(item.evidenceUrls) && item.evidenceUrls.length > 0,
    `Library-expansion item ${item.masterId} needs at least one evidence URL`,
  );
  assertUnique(item.evidenceUrls.map((url) => ({ url })), (item) => item.url, `Library-expansion item ${item.masterId} evidence`);
  assert(
    item.evidenceUrls.every((url) => typeof url === "string" && /^https:\/\/[^/\s]+\/.+/.test(url)),
    `Library-expansion item ${item.masterId} has an invalid evidence URL`,
  );
  assert(reviewStatuses.has(item.reviewStatus), `Library-expansion item ${item.masterId} has invalid review status`);
}
const libraryExpansionContentHash = createHash("sha256").update(JSON.stringify({
  selectionRule: manifest.libraryExpansion.selectionRule,
  items: manifest.libraryExpansion.items.map(({ reviewStatus, ...item }) => item),
})).digest("hex");
assert(
  libraryExpansionContentHash === "212fb6eded86a16a89e02387694fce7c94bfe3ca835de70020f6819fcc8df661",
  "Curated Library selection rationale or evidence changed without an intentional review-snapshot update",
);
const globalNames = new Map();
for (const master of manifest.masters) {
  assertOnlyKeys(master, new Set([
    "id",
    "name",
    "reviewStatus",
    "aliases",
    "primaryTargets",
    "secondaryTargets",
    "movementPattern",
    "equipment",
    "purpose",
    "style",
    "laterality",
    "support",
    "emphases",
    "typicalChallenge",
    "defaultPrescription",
    "instructions",
    "videoId",
  ]), `Master ${master.id}`);
  assert(typeof master.name === "string" && master.name.trim(), `Master ${master.id} has no name`);
  assert(reviewStatuses.has(master.reviewStatus), `Master ${master.id} has invalid review status`);
  assert(Array.isArray(master.aliases), `Master ${master.id} aliases must be an array`);
  assertControlledList(master.primaryTargets, supportedTargets, `Master ${master.id} primaryTargets`, 1, 2);
  assertControlledList(master.secondaryTargets, supportedTargets, `Master ${master.id} secondaryTargets`);
  assert(
    !master.primaryTargets.some((target) => master.secondaryTargets.includes(target)),
    `Master ${master.id} repeats a primary target as secondary`,
  );
  assertOptionalControlled(master.movementPattern, supportedMovements, `Master ${master.id} movementPattern`);
  assert(master.movementPattern, `Master ${master.id} needs one movement pattern`);
  assertControlledList(master.equipment, supportedEquipment, `Master ${master.id} equipment`, 1);
  assertOptionalControlled(master.purpose, supportedPurposes, `Master ${master.id} purpose`);
  assert(master.purpose, `Master ${master.id} needs one purpose`);
  assertOptionalControlled(master.style, supportedStyles, `Master ${master.id} style`);
  assertOptionalControlled(master.laterality, supportedLateralities, `Master ${master.id} laterality`);
  assertOptionalControlled(master.support, supportedSupports, `Master ${master.id} support`);
  assertControlledList(master.emphases, supportedEmphases, `Master ${master.id} emphases`);
  assertOptionalControlled(master.typicalChallenge, supportedChallenges, `Master ${master.id} typicalChallenge`);
  assert(typeof master.defaultPrescription === "string", `Master ${master.id} defaultPrescription must be text`);
  if (master.id === "45-degree-glute-biased-back-extension") {
    assert(master.defaultPrescription === "", "45° back extension must not invent a default prescription");
  } else {
    assert(master.defaultPrescription.trim(), `Master ${master.id} needs a default prescription`);
  }
  assert(typeof master.instructions === "string", `Master ${master.id} instructions must be text`);
  assert(typeof master.videoId === "string", `Master ${master.id} videoId must be text`);
  assert(!master.videoId || /^[A-Za-z0-9_-]{11}$/.test(master.videoId), `Master ${master.id} has an invalid YouTube video ID`);
  const names = [{ name: master.name, kind: "canonical" }, ...master.aliases.map((alias) => {
    assertOnlyKeys(alias, new Set(["name", "reviewStatus"]), `Master ${master.id} alias`);
    assert(alias && typeof alias.name === "string" && alias.name.trim(), `Master ${master.id} has an invalid alias`);
    assert(reviewStatuses.has(alias.reviewStatus), `Master ${master.id} alias has invalid review status`);
    return { name: alias.name, kind: "alias" };
  })];
  for (const { name, kind } of names) {
    const normalized = normalize(name);
    assert(normalized, `Master ${master.id} has an empty normalized ${kind}`);
    assert(!globalNames.has(normalized), `Name collision: ${name} conflicts with ${globalNames.get(normalized)}`);
    globalNames.set(normalized, `${master.id} (${kind})`);
  }
}
for (const item of manifest.libraryExpansion.items) {
  const master = mastersById.get(item.masterId);
  assert(
    master.reviewStatus === item.reviewStatus
      && master.aliases.every((alias) => alias.reviewStatus === item.reviewStatus),
    `Library-expansion review status is inconsistent for ${item.masterId}`,
  );
}
assert(
  manifest.masters.reduce((count, master) => count + master.aliases.length, 0) === 31,
  "Expected 27 source-backed aliases plus four curated-expansion aliases",
);
const passiveHipRotation = manifest.masters.find((master) => master.id === "gentle-passive-internal-rotation-stretch");
assert(
  passiveHipRotation?.name === "Gentle passive hip internal-rotation stretch"
    && passiveHipRotation.aliases.some((alias) => alias.name === "Gentle passive internal-rotation stretch"),
  "The passive internal-rotation stretch must identify the hip while preserving the old text as an alias",
);
const currentTargetIds = new Set(EXERCISE_TARGETS.map((option) => option.id));
const currentMovementIds = new Set(MOVEMENT_PATTERNS.map((option) => option.id));
assert(
  ["neck", "feet-toes"].every((id) => currentTargetIds.has(id)),
  "Production vocabulary must include the two approved content-review targets",
);
assert(
  ["foot-toe-control", "hip-extension", "neck-movement", "shrug"].every((id) => currentMovementIds.has(id)),
  "Production vocabulary must include the four approved content-review movements",
);
const usedNewTargets = [...new Set(manifest.masters
  .flatMap((master) => [...master.primaryTargets, ...master.secondaryTargets])
  .filter((target) => !currentTargetIds.has(target)))].sort();
const usedNewMovements = [...new Set(manifest.masters
  .map((master) => master.movementPattern)
  .filter((movement) => !currentMovementIds.has(movement)))].sort();
assert(
  usedNewTargets.length === 0,
  "Content review must use only production target vocabulary",
);
assert(
  usedNewMovements.length === 0,
  "Content review must use only production movement vocabulary",
);

for (const item of manifest.currentMasters) {
  assertOnlyKeys(item, new Set(["key", "currentId", "currentName", "resolution"]), `Current master ${item.currentId}`);
  assert(item.key === `current:${item.currentId}`, `Invalid current-master key: ${item.key}`);
  assert(typeof item.currentName === "string" && item.currentName.trim(), `Current-master snapshot name is missing: ${item.currentId}`);
  assertResolution(item.resolution, masterIds, item.key, currentResolutionKinds);
}

assert(Array.isArray(manifest.sourceSubjects), "sourceSubjects must be an array");
assertUnique(manifest.sourceSubjects, (item) => item.key, "sourceSubjects");
assertUnique(manifest.sourceSubjects, (item) => item.rawLabel, "sourceSubjects raw labels");
assertUnique(manifest.sourceSubjects, (item) => item.normalizedLabel, "sourceSubjects normalized labels");
const subjectsByKey = new Map(manifest.sourceSubjects.map((subject) => [subject.key, subject]));
for (const subject of manifest.sourceSubjects) {
  assertOnlyKeys(
    subject,
    new Set(["key", "rawLabel", "normalizedLabel", "compoundCandidate", "resolution"]),
    `Source subject ${subject.key}`,
  );
  assert(subject.normalizedLabel === normalize(subject.rawLabel), `Stale normalized label: ${subject.key}`);
  assert(typeof subject.compoundCandidate === "boolean", `Missing compound flag: ${subject.key}`);
  assert(subject.compoundCandidate === /\bor\b|\s\/\s/i.test(subject.rawLabel), `Incorrect compound flag: ${subject.key}`);
  assertResolution(subject.resolution, masterIds, subject.key, resolutionKinds);
}

assert(Array.isArray(manifest.rawInventory), "rawInventory must be an array");
assertUnique(manifest.rawInventory, (item) => item.key, "rawInventory");
const numbered = manifest.rawInventory.filter((item) => item.kind === "numbered-occurrence");
const directives = manifest.rawInventory.filter((item) => item.kind === "embedded-directive");
assert(numbered.length === 155, `Expected 155 numbered occurrences, found ${numbered.length}`);
assert(directives.length === 3, `Expected 3 embedded directives, found ${directives.length}`);
assert(manifest.rawInventory.length === 158, `Expected 158 total inventory rows, found ${manifest.rawInventory.length}`);
assert(manifest.sourceSubjects.length === 135, `Expected 135 unique identity subjects, found ${manifest.sourceSubjects.length}`);
assert(directives.every((item) => expectedDirectiveKeys.has(item.key)), "Embedded directive keys do not match the reviewed source contract");

const referencedSubjects = new Set();
for (const item of manifest.rawInventory) {
  assertOnlyKeys(
    item,
    new Set(["key", "kind", "sourceLine", "routineContext", "blockContext", "rawNumber", "subjectKey"]),
    `Inventory row ${item.key}`,
  );
  assert(["numbered-occurrence", "embedded-directive"].includes(item.kind), `Invalid inventory kind: ${item.kind}`);
  assert(Number.isInteger(item.sourceLine) && item.sourceLine > 0 && item.sourceLine <= sourceLineCount, `Invalid source line: ${item.key}`);
  assert(typeof item.routineContext === "string" && item.routineContext, `Missing routine context: ${item.key}`);
  assert(typeof item.blockContext === "string" && item.blockContext, `Missing block context: ${item.key}`);
  const subject = subjectsByKey.get(item.subjectKey);
  assert(subject, `Missing subject for inventory row: ${item.key}`);
  referencedSubjects.add(item.subjectKey);
  if (item.kind === "numbered-occurrence") {
    const match = sourceLines[item.sourceLine - 1].match(/^(\d+)\.\s+(.+?)\s+—\s+(.+)$/);
    assert(match, `Malformed numbered raw line: ${item.key}`);
    assert(Number(match[1]) === item.rawNumber, `Raw number mismatch: ${item.key}`);
    assert(match[2] === subject.rawLabel, `Raw label mismatch: ${item.key}`);
    const expectedKey = `pplppl7:${item.routineContext}:${String(item.rawNumber).padStart(3, "0")}`;
    assert(item.key === expectedKey, `Unstable occurrence key: ${item.key}`);
  }
}
assert(referencedSubjects.size === subjectsByKey.size, "Every source subject must be referenced by the raw inventory");

for (const [routine, count] of expectedRoutineCounts) {
  const actual = numbered.filter((item) => item.routineContext === routine).length;
  assert(actual === count, `${routine} expected ${count} occurrences, found ${actual}`);
}
assert(numbered.every((item) => expectedRoutineCounts.has(item.routineContext)), "Unexpected routine context in numbered inventory");
for (const [block, count] of expectedHomeBaseBlockCounts) {
  const actual = numbered.filter((item) => item.routineContext === "home-base" && item.blockContext === block).length;
  assert(actual === count, `Home Base ${block} expected ${count} occurrences, found ${actual}`);
}
for (const [context, count] of expectedContextCounts) {
  const [routine, block] = context.split("|");
  const actual = numbered.filter((item) => item.routineContext === routine && item.blockContext === block).length;
  assert(actual === count, `${context} expected ${count} occurrences, found ${actual}`);
}

const numberedCompoundCount = numbered.filter((item) => subjectsByKey.get(item.subjectKey).compoundCandidate).length;
assert(numberedCompoundCount === 27, `Expected 27 numbered compound candidates, found ${numberedCompoundCount}`);
const bracketedSourceLines = sourceLines.filter((line) => /^\s*\[.*\]$/.test(line)).length;
assert(bracketedSourceLines === 53, `Expected 53 bracketed source annotations, found ${bracketedSourceLines}`);
const attachedAnnotations = numbered.reduce((sum, item) => {
  let cursor = item.sourceLine;
  let count = 0;
  while (cursor < sourceLines.length && /^\s+\[.*\]$/.test(sourceLines[cursor])) {
    count += 1;
    cursor += 1;
  }
  return sum + count;
}, 0);
assert(attachedAnnotations === 51, `Expected 51 attached occurrence annotations, found ${attachedAnnotations}`);

const expectedProgramRoutineIds = [
  "push-a-glutes",
  "pull-a",
  "legs-a",
  "push-b",
  "pull-b",
  "legs-b",
  "home-base",
  "push-morning",
  "pull-morning",
  "legs-morning",
];
const expectedMappedEntryCounts = new Map([
  ["push-a-glutes", 13],
  ["pull-a", 12],
  ["legs-a", 13],
  ["push-b", 10],
  ["pull-b", 10],
  ["legs-b", 13],
  ["home-base", 52],
  ["push-morning", 10],
  ["pull-morning", 10],
  ["legs-morning", 13],
]);
const expectedMappedChoiceCounts = new Map([
  ["push-a-glutes", 15],
  ["pull-a", 15],
  ["legs-a", 17],
  ["push-b", 15],
  ["pull-b", 13],
  ["legs-b", 17],
  ["home-base", 59],
  ["push-morning", 10],
  ["pull-morning", 10],
  ["legs-morning", 13],
]);
const expectedContextByRoutineId = new Map([
  ["push-a-glutes", "gym-push-a"],
  ["pull-a", "gym-pull-a"],
  ["legs-a", "gym-legs-a"],
  ["push-b", "gym-push-b"],
  ["pull-b", "gym-pull-b"],
  ["legs-b", "gym-legs-b"],
  ["home-base", "home-base"],
  ["push-morning", "morning-push"],
  ["pull-morning", "morning-pull"],
  ["legs-morning", "morning-legs"],
]);
const expectedRoutineMetadata = new Map([
  ["push-a-glutes", ["Push A + Glutes", "gym", "required", 19]],
  ["pull-a", ["Pull A", "gym", "required", 49]],
  ["legs-a", ["Legs A", "gym", "required", 69]],
  ["push-b", ["Push B", "gym", "required", 92]],
  ["pull-b", ["Pull B", "gym", "required", 110]],
  ["legs-b", ["Legs B", "gym", "required", 128]],
  ["home-base", ["Home Base", "home", "optional", 156]],
  ["push-morning", ["Push morning", "home", "required", 302]],
  ["pull-morning", ["Pull morning", "home", "required", 317]],
  ["legs-morning", ["Legs morning", "home", "required", 332]],
]);
const expectedBlockReviews = new Map([
  ["push-a-glutes", [
    ["upper-body-work", "Upper-body work", 21],
    ["glute-block", "Glute block", 27],
    ["upper-body-accessories", "Upper-body accessories", 34],
    ["optional-coverage-rehab", "Optional coverage · Rehab", 41],
  ]],
  ["pull-a", [["main", "", 49], ["optional-coverage-rehab", "Optional coverage · Rehab", 60]]],
  ["legs-a", [["main", "Glutes and quads", 69], ["optional-coverage-rehab", "Optional coverage · Rehab", 81]]],
  ["push-b", [["main", "", 92], ["optional-coverage-rehab", "Optional coverage · Rehab", 103]]],
  ["pull-b", [["main", "", 110], ["optional-coverage-rehan", "Optional coverage · Rehab", 122]]],
  ["legs-b", [["main", "Glutes and posterior chain", 128], ["optional-coverage-rehab", "Optional coverage · Rehab", 144]]],
  ["home-base", [
    ["core", "Core", 171],
    ["shoulder-scapula-and-spine", "Shoulder, scapula, and spine", 190],
    ["hip-flexion-and-extension", "Hip flexion and extension", 210],
    ["hip-rotation-and-circumduction", "Hip rotation and circumduction", 225],
    ["hip-abduction-adduction-and-frontal-plane", "Hip abduction, adduction, and frontal plane", 246],
    ["single-leg-and-pelvic-control", "Single-leg and pelvic control", 260],
    ["ankle-and-lower-leg", "Ankle and lower leg", 277],
  ]],
  ["push-morning", [["main", "Shoulders, serratus, and posture", 302]]],
  ["pull-morning", [["main", "Lower traps, rotator cuff, and posture", 317]]],
  ["legs-morning", [["main", "Hips, ankles, and squat control", 332]]],
]);

assert(Array.isArray(manifest.programs) && manifest.programs.length === 1, "Slice 10E-B must map exactly one program");
const program = manifest.programs[0];
assertOnlyKeys(program, new Set(["id", "name", "note", "routineIds"]), "Program");
assert(program.id === "pplppl7-glute-specialization", "Unexpected mapped program ID");
assert(program.name === "PPLPPL 7 — Glute Specialization", "Unexpected mapped program name");
assert(typeof program.note === "string" && program.note.trim(), "Program note is missing");
assert(Array.isArray(program.routineIds), "Program routineIds must be an array");
assert(
  JSON.stringify(program.routineIds) === JSON.stringify(expectedProgramRoutineIds),
  "Program routine order differs from the proposed source-faithful order",
);
assertUnique(program.routineIds.map((id) => ({ id })), (item) => item.id, "Program routine IDs");
for (const requiredText of [
  "Day 7 — Rest: no gym resistance training.",
  "Keep all movements controlled and away from failure.",
  "Use hand support and heel elevation as needed.",
  "Do not force through pinching, sharp pain, or a hard joint block.",
  "Progress by improving control, range, pauses, or reducing assistance before adding resistance.",
  "When fatigued, perform one set of each instead of skipping everything.",
]) {
  assert(program.note.includes(requiredText), `Program note lost source text: ${requiredText}`);
}

assert(Array.isArray(manifest.routines) && manifest.routines.length === 10, "Expected 10 mapped routines");
assertUnique(manifest.routines, (routine) => routine.id, "Routines");
assertUnique(manifest.routines, (routine) => routine.sourceContext, "Routine source contexts");
const routinesById = new Map(manifest.routines.map((routine) => [routine.id, routine]));
assert(
  manifest.routines.every((routine) => program.routineIds.includes(routine.id)),
  "Every mapped routine must belong to the single program",
);

const inventoryByKey = new Map(manifest.rawInventory.map((item) => [item.key, item]));
function expectedProgramPrescription(sourceItem, choiceIndex) {
  if (sourceItem.kind === "embedded-directive") {
    if (sourceItem.key === "pplppl7:gym-legs-a:003:alternative-01") return "2 × 8–12/leg";
    if (sourceItem.key === "pplppl7:gym-legs-b:after-003:optional-quad-01") return "2 × 10–15";
    if (sourceItem.key === "pplppl7:gym-legs-b:001:rotation-01") {
      throw new Error("The reviewed RDL rotation directive is note-only and has no choice prescription");
    }
    throw new Error(`Unhandled embedded directive prescription: ${sourceItem.key}`);
  }
  const match = sourceLines[sourceItem.sourceLine - 1].match(/^\d+\.\s+.+?\s+—\s+(.+)$/);
  assert(match, `Cannot read prescription for ${sourceItem.key}`);
  if (sourceItem.subjectKey === "label:sorensen-hold-or-prone-back-extension") {
    return choiceIndex === 0 ? "1–2 × 20–45 sec" : "1–2 × 8–15";
  }
  return match[1]
    .replace(/seconds/g, "sec")
    .replace(/,\s+(?=\d)/, " · ")
    .replace(/slow circles each direction\/side/g, "slow circles/direction/side");
}
const mappedSourceKeyCounts = new Map();
const mappedEntryIds = new Set();
const mappedBlockIds = new Set();
let mappedEntryCount = 0;
let mappedChoiceCount = 0;
let homeBaseEntryNotes = 0;
let mappedNoteSourceLines = 0;

for (const routine of manifest.routines) {
  assertOnlyKeys(
    routine,
    new Set(["id", "sourceContext", "sourceLines", "name", "location", "status", "note", "blocks", "entries"]),
    `Routine ${routine.id}`,
  );
  assert(expectedMappedEntryCounts.has(routine.id), `Unexpected mapped routine: ${routine.id}`);
  assert(routine.sourceContext === expectedContextByRoutineId.get(routine.id), `Wrong source context for ${routine.id}`);
  assert(Array.isArray(routine.sourceLines) && routine.sourceLines.length > 0, `Routine ${routine.id} needs source lines`);
  assert(routine.sourceLines.every((line) => Number.isInteger(line) && line > 0 && line <= sourceLineCount), `Routine ${routine.id} has invalid source lines`);
  assert(typeof routine.name === "string" && routine.name.trim(), `Routine ${routine.id} has no name`);
  assert(["gym", "home"].includes(routine.location), `Routine ${routine.id} has invalid location`);
  assert(["required", "optional"].includes(routine.status), `Routine ${routine.id} has invalid status`);
  assert(typeof routine.note === "string", `Routine ${routine.id} note must be plain text`);
  const [expectedName, expectedLocation, expectedStatus, expectedHeadingLine] = expectedRoutineMetadata.get(routine.id);
  assert(routine.name === expectedName, `Routine ${routine.id} name differs from the review`);
  assert(routine.location === expectedLocation, `Routine ${routine.id} location differs from the review`);
  assert(routine.status === expectedStatus, `Routine ${routine.id} status differs from the review`);
  assert(routine.sourceLines[0] === expectedHeadingLine, `Routine ${routine.id} source heading line is wrong`);
  assert(Array.isArray(routine.blocks) && routine.blocks.length > 0, `Routine ${routine.id} needs at least one block`);
  assertUnique(routine.blocks, (block) => block.id, `Routine ${routine.id} blocks`);
  const localBlockIds = new Set();
  for (const block of routine.blocks) {
    assertOnlyKeys(block, new Set(["id", "name", "sourceLine", "sourceContext"]), `Routine ${routine.id} block`);
    assert(typeof block.name === "string", `Routine ${routine.id} block name must be text`);
    assert(Number.isInteger(block.sourceLine) && block.sourceLine > 0 && block.sourceLine <= sourceLineCount, `Routine ${routine.id} block has invalid source line`);
    assert(typeof block.sourceContext === "string" && block.sourceContext, `Routine ${routine.id} block needs a source context`);
    assert(!mappedBlockIds.has(block.id), `Duplicate global block ID: ${block.id}`);
    mappedBlockIds.add(block.id);
    localBlockIds.add(block.id);
  }
  const expectedBlockContexts = [];
  for (const item of numbered
    .filter((candidate) => candidate.routineContext === routine.sourceContext)
    .sort((left, right) => left.sourceLine - right.sourceLine)) {
    if (!expectedBlockContexts.includes(item.blockContext)) expectedBlockContexts.push(item.blockContext);
  }
  assert(
    JSON.stringify(routine.blocks.map((block) => block.sourceContext)) === JSON.stringify(expectedBlockContexts),
    `Routine ${routine.id} block order differs from the source`,
  );
  assert(
    JSON.stringify(routine.blocks.map((block) => [block.sourceContext, block.name, block.sourceLine]))
      === JSON.stringify(expectedBlockReviews.get(routine.id)),
    `Routine ${routine.id} block names or heading lines differ from the review`,
  );

  assert(Array.isArray(routine.entries), `Routine ${routine.id} entries must be an array`);
  assert(routine.entries.length === expectedMappedEntryCounts.get(routine.id), `Wrong entry count for ${routine.id}`);
  const routineChoiceCount = routine.entries.reduce((sum, entry) => sum + entry.choices.length, 0);
  assert(routineChoiceCount === expectedMappedChoiceCounts.get(routine.id), `Wrong choice count for ${routine.id}`);
  mappedEntryCount += routine.entries.length;
  mappedChoiceCount += routineChoiceCount;
  const expectedEntryAnchors = numbered
    .filter((item) => item.routineContext === routine.sourceContext)
    .sort((left, right) => left.sourceLine - right.sourceLine)
    .map((item) => item.key);
  if (routine.id === "legs-b") {
    expectedEntryAnchors.splice(
      expectedEntryAnchors.indexOf("pplppl7:gym-legs-b:003") + 1,
      0,
      "pplppl7:gym-legs-b:after-003:optional-quad-01",
    );
  }
  assert(
    JSON.stringify(routine.entries.map((entry) => entry.sourceKeys[0])) === JSON.stringify(expectedEntryAnchors),
    `Routine ${routine.id} entry order differs from the reviewed source order`,
  );

  for (const entry of routine.entries) {
    assertOnlyKeys(
      entry,
      new Set(["id", "sourceKeys", "blockId", "role", "note", "noteSourceLine", "choices"]),
      `Entry ${entry.id}`,
    );
    assert(typeof entry.id === "string" && entry.id, `Routine ${routine.id} has an entry without an ID`);
    assert(!mappedEntryIds.has(entry.id), `Duplicate global entry ID: ${entry.id}`);
    mappedEntryIds.add(entry.id);
    assert(Array.isArray(entry.sourceKeys) && entry.sourceKeys.length > 0, `Entry ${entry.id} has no source keys`);
    assertUnique(entry.sourceKeys.map((key) => ({ key })), (item) => item.key, `Entry ${entry.id} source keys`);
    assert(localBlockIds.has(entry.blockId), `Entry ${entry.id} has a dangling block`);
    assert(["main", "optional"].includes(entry.role), `Entry ${entry.id} has an invalid role`);
    assert(typeof entry.note === "string", `Entry ${entry.id} note must be plain text`);
    if (entry.noteSourceLine !== undefined) {
      assert(Number.isInteger(entry.noteSourceLine), `Entry ${entry.id} note source line must be an integer`);
      assert(/^\s*\[.*\]\s*$/.test(sourceLines[entry.noteSourceLine - 1]), `Entry ${entry.id} note source is not bracketed`);
      mappedNoteSourceLines += 1;
    }
    if (routine.id === "home-base" && entry.note) homeBaseEntryNotes += 1;
    assert(Array.isArray(entry.choices) && entry.choices.length > 0, `Entry ${entry.id} must have choices`);
    assertUnique(entry.choices, (choice) => choice.exerciseId, `Entry ${entry.id} choices`);

    const expectedChoices = [];
    for (const sourceKey of entry.sourceKeys) {
      const sourceItem = inventoryByKey.get(sourceKey);
      assert(sourceItem, `Entry ${entry.id} references unknown source key: ${sourceKey}`);
      assert(sourceItem.routineContext === routine.sourceContext, `Entry ${entry.id} crosses routine source contexts`);
      const entryBlock = routine.blocks.find((block) => block.id === entry.blockId);
      assert(entryBlock.sourceContext === sourceItem.blockContext, `Entry ${entry.id} moved out of its source block`);
      mappedSourceKeyCounts.set(sourceKey, (mappedSourceKeyCounts.get(sourceKey) || 0) + 1);
      if (sourceItem.key === "pplppl7:gym-legs-b:001:rotation-01") continue;
      subjectsByKey.get(sourceItem.subjectKey).resolution.masterIds.forEach((exerciseId, choiceIndex) => {
        expectedChoices.push({
          exerciseId,
          prescription: expectedProgramPrescription(sourceItem, choiceIndex),
        });
      });
    }
    assert(
      JSON.stringify(entry.choices) === JSON.stringify(expectedChoices),
      `Entry ${entry.id} choice order or prescription differs from its reviewed source`,
    );
    const firstSourceItem = inventoryByKey.get(entry.sourceKeys[0]);
    const expectedRole = routine.id === "home-base"
      || firstSourceItem.blockContext.startsWith("optional-coverage")
      || firstSourceItem.key === "pplppl7:gym-legs-b:after-003:optional-quad-01"
      ? "optional"
      : "main";
    assert(entry.role === expectedRole, `Entry ${entry.id} role differs from its reviewed source meaning`);
    for (const choice of entry.choices) {
      assertOnlyKeys(choice, new Set(["exerciseId", "prescription"]), `Entry ${entry.id} choice`);
      assert(masterIds.has(choice.exerciseId), `Entry ${entry.id} choice references a missing master`);
      assert(typeof choice.prescription === "string" && choice.prescription.trim(), `Entry ${entry.id} has an empty prescription`);
    }
  }
}

assert(mappedEntryCount === 156, `Expected 156 mapped entry slots, found ${mappedEntryCount}`);
assert(mappedChoiceCount === 184, `Expected 184 mapped choices, found ${mappedChoiceCount}`);
assert(mappedNoteSourceLines === 50, `Expected 50 attached note-source lines, found ${mappedNoteSourceLines}`);
assert(homeBaseEntryNotes === 47, `Expected 47 normalized Home Base notes, found ${homeBaseEntryNotes}`);
for (const item of manifest.rawInventory) {
  assert(mappedSourceKeyCounts.get(item.key) === 1, `Source key must map to exactly one entry: ${item.key}`);
}
const firstProgramPrescription = new Map();
for (const routine of manifest.routines) {
  for (const entry of routine.entries) {
    for (const choice of entry.choices) {
      if (!firstProgramPrescription.has(choice.exerciseId)) {
        firstProgramPrescription.set(choice.exerciseId, choice.prescription);
      }
    }
  }
}
for (const [exerciseId, prescription] of firstProgramPrescription) {
  const master = manifest.masters.find((candidate) => candidate.id === exerciseId);
  assert(
    master.defaultPrescription === prescription,
    `Master ${exerciseId} default prescription must match its first programmed prescription`,
  );
}

const homeBase = routinesById.get("home-base");
assert(homeBase.status === "optional", "Home Base must be Optional");
assert(homeBase.blocks.length === 7, "Home Base must keep seven blocks");
assert(homeBase.entries.every((entry) => entry.role === "optional"), "Every Home Base entry must be Optional");
for (const morningId of ["push-morning", "pull-morning", "legs-morning"]) {
  const morning = routinesById.get(morningId);
  assert(morning.location === "home" && morning.status === "required", `${morningId} must keep the proposed Home/Required mapping`);
  assert(morning.blocks.length === 1, `${morningId} must keep one focus block`);
  assert(morning.entries.every((entry) => entry.role === "main"), `${morningId} entries must keep the proposed Main role`);
}
assert(!manifest.routines.some((routine) => /rest/i.test(routine.id) || /^rest$/i.test(routine.name)), "Rest must not become a routine");
const normalizedProgramText = JSON.stringify({
  programs: manifest.programs.map(({ name, note }) => ({ name, note })),
  routines: manifest.routines.map((routine) => ({
    name: routine.name,
    note: routine.note,
    blockNames: routine.blocks.map((block) => block.name),
    entries: routine.entries.map((entry) => ({
      note: entry.note,
      prescriptions: entry.choices.map((choice) => choice.prescription),
    })),
  })),
});
assert(!/New 6/i.test(normalizedProgramText), "Normalized program must not contain New 6");
assert(!/Rehan/i.test(normalizedProgramText), "Normalized program must not contain Rehan");
assert(!/\bOR\b/.test(normalizedProgramText), "Normalized program must not contain all-caps OR");

assert(Array.isArray(manifest.editorialCorrections) && manifest.editorialCorrections.length === 5, "Expected five grouped editorial corrections");
assertUnique(manifest.editorialCorrections, (correction) => correction.id, "Editorial corrections");
for (const correction of manifest.editorialCorrections) {
  assertOnlyKeys(
    correction,
    new Set(["id", "sourceLines", "raw", "normalized", "reason", "reviewStatus"]),
    `Editorial correction ${correction.id}`,
  );
  assert(Array.isArray(correction.sourceLines) && correction.sourceLines.length > 0, `Correction ${correction.id} needs source lines`);
  assert(Array.isArray(correction.raw) && correction.raw.length === correction.sourceLines.length, `Correction ${correction.id} raw/source mismatch`);
  correction.sourceLines.forEach((line, index) => {
    assert(sourceLines[line - 1].trim() === correction.raw[index], `Correction ${correction.id} raw text does not match line ${line}`);
  });
  assert(Array.isArray(correction.normalized) && correction.normalized.length > 0, `Correction ${correction.id} needs normalized text`);
  assert(typeof correction.reason === "string" && correction.reason.trim(), `Correction ${correction.id} needs a reason`);
  assert(reviewStatuses.has(correction.reviewStatus), `Correction ${correction.id} has invalid review status`);
}

assertOnlyKeys(manifest.programReview, new Set(["status", "decisions"]), "programReview");
assert(["needs-owner", "approved"].includes(manifest.programReview.status), "Invalid program review status");
assert(Array.isArray(manifest.programReview.decisions) && manifest.programReview.decisions.length === 8, "Expected eight program-review decisions");
assertUnique(manifest.programReview.decisions, (decision) => decision.id, "Program-review decisions");
for (const decision of manifest.programReview.decisions) {
  assertOnlyKeys(decision, new Set(["id", "question", "recommended", "reviewStatus"]), `Program decision ${decision.id}`);
  assert(typeof decision.question === "string" && decision.question.trim(), `Program decision ${decision.id} needs a question`);
  assert(typeof decision.recommended === "string" && decision.recommended.trim(), `Program decision ${decision.id} needs a recommendation`);
  assert(reviewStatuses.has(decision.reviewStatus), `Program decision ${decision.id} has invalid review status`);
}
const pendingProgramDecisionCount = manifest.programReview.decisions
  .filter((decision) => decision.reviewStatus !== "approved").length;
assert(
  manifest.programReview.status === (pendingProgramDecisionCount ? "needs-owner" : "approved"),
  "Program review status does not match its decisions",
);
const rdlDecision = manifest.programReview.decisions.find((decision) => decision.id === "rdl-back-extension-prescription");
assert(rdlDecision?.reviewStatus === "approved", "RDL note-only decision must be owner-approved");
assert(
  manifest.editorialCorrections.every((correction) => correction.reviewStatus === "approved"),
  "Owner-approved program review cannot retain proposed editorial corrections",
);
const reviewedRdlEntry = routinesById.get("legs-b").entries.find((entry) => entry.id === "legs-b-entry-001");
assert(
  JSON.stringify(reviewedRdlEntry.choices) === JSON.stringify([{
    exerciseId: "romanian-deadlift",
    prescription: "3 × 6–10",
  }]),
  "Romanian deadlift must remain the sole exercise choice in its slot",
);
assert(
  reviewedRdlEntry.sourceKeys.includes("pplppl7:gym-legs-b:001:rotation-01")
    && reviewedRdlEntry.note === "Rotate with a 45° glute-biased back extension when needed. Do not perform both automatically.",
  "The 45° back-extension rotation directive must remain a note on Romanian deadlift",
);
const programReviewSnapshot = {
  programs: manifest.programs,
  routines: manifest.routines,
  editorialCorrections: manifest.editorialCorrections,
  programReview: manifest.programReview,
};
const programReviewHash = createHash("sha256").update(JSON.stringify(programReviewSnapshot)).digest("hex");
assert(
  programReviewHash === "a8bc2267a336832384ce1999625f5d9e2fec10e35b4606aefe0dbb08bab6b8b4",
  "Program review content changed without an intentional review-snapshot update",
);

assert(Array.isArray(manifest.relationships) && manifest.relationships.length === 33, "Expected 25 source-backed plus eight expansion relationships");
assertUnique(manifest.relationships, (relationship) => relationship.id, "Relationships");
const relationshipPairs = new Set();
for (const relationship of manifest.relationships) {
  assertOnlyKeys(
    relationship,
    new Set(["id", "exerciseId", "relatedExerciseId", "relation", "reviewStatus"]),
    `Relationship ${relationship.id}`,
  );
  assert(masterIds.has(relationship.exerciseId), `Relationship ${relationship.id} has a missing source master`);
  assert(masterIds.has(relationship.relatedExerciseId), `Relationship ${relationship.id} has a missing related master`);
  assert(relationship.exerciseId !== relationship.relatedExerciseId, `Relationship ${relationship.id} links a master to itself`);
  assert(supportedRelations.has(relationship.relation), `Relationship ${relationship.id} has an invalid relation`);
  assert(reviewStatuses.has(relationship.reviewStatus), `Relationship ${relationship.id} has an invalid review status`);
  const pairKey = [relationship.exerciseId, relationship.relatedExerciseId].sort().join("|");
  assert(!relationshipPairs.has(pairKey), `Duplicate relationship pair: ${pairKey}`);
  relationshipPairs.add(pairKey);
}
assert(
  !relationshipPairs.has(["45-degree-glute-biased-back-extension", "romanian-deadlift"].sort().join("|")),
  "The note-only RDL rotation must not become a global relationship",
);
assert(
  !relationshipPairs.has(["standing-calf-raise", "seated-calf-raise"].sort().join("|")),
  "Straight-knee and bent-knee calf raises must not be flattened into general alternatives",
);
const expansionRelationships = manifest.relationships.filter((relationship) => (
  expansionMasterIds.has(relationship.exerciseId) || expansionMasterIds.has(relationship.relatedExerciseId)
));
const sourceBackedRelationships = manifest.relationships.filter((relationship) => (
  !expansionMasterIds.has(relationship.exerciseId) && !expansionMasterIds.has(relationship.relatedExerciseId)
));
assert(sourceBackedRelationships.length === 25, "Expected 25 conservative source-backed relationships");
assert(expansionRelationships.length === 8, "Expected eight curated-expansion relationships");
const coreRelationshipContentHash = createHash("sha256").update(JSON.stringify(
  sourceBackedRelationships.map(({ reviewStatus, ...relationship }) => relationship),
)).digest("hex");
assert(
  coreRelationshipContentHash === "067c23d259744e3879957d0ccd7dba211f88304214e8b03c7bffeb532e29ad47",
  "Source-backed relationship content changed without an intentional review-snapshot update",
);
for (const id of expansionMasterIds) {
  assert(
    expansionRelationships.some((relationship) => (
      relationship.exerciseId === id || relationship.relatedExerciseId === id
    )),
    `Curated Library master has no decision-useful relationship: ${id}`,
  );
}
const expansionRelationshipContentHash = createHash("sha256").update(JSON.stringify(
  expansionRelationships.map(({ reviewStatus, ...relationship }) => relationship),
)).digest("hex");
assert(
  expansionRelationshipContentHash === "5f34d65b2e013220758bbefffacc63a0bc0597e519aeac5e6ae54cabb87d8c1a",
  "Curated Library relationship content changed without an intentional review-snapshot update",
);

assertOnlyKeys(manifest.contentReview, new Set(["status", "decisions"]), "contentReview");
assert(["needs-owner", "approved"].includes(manifest.contentReview.status), "Invalid content-review status");
assert(Array.isArray(manifest.contentReview.decisions) && manifest.contentReview.decisions.length === 6, "Expected six content-review decisions");
assertUnique(manifest.contentReview.decisions, (decision) => decision.id, "Content-review decisions");
for (const decision of manifest.contentReview.decisions) {
  assertOnlyKeys(decision, new Set(["id", "question", "recommended", "reviewStatus"]), `Content decision ${decision.id}`);
  assert(typeof decision.question === "string" && decision.question.trim(), `Content decision ${decision.id} needs a question`);
  assert(typeof decision.recommended === "string" && decision.recommended.trim(), `Content decision ${decision.id} needs a recommendation`);
  assert(reviewStatuses.has(decision.reviewStatus), `Content decision ${decision.id} has an invalid review status`);
}
const pendingContentDecisionCount = manifest.contentReview.decisions
  .filter((decision) => decision.reviewStatus !== "approved").length;
const pendingRelationshipCount = manifest.relationships
  .filter((relationship) => relationship.reviewStatus !== "approved").length;
assert(
  manifest.contentReview.status === (pendingContentDecisionCount ? "needs-owner" : "approved"),
  "Content-review status does not match its decisions",
);
const pendingExpansionItemCount = manifest.libraryExpansion.items
  .filter((item) => item.reviewStatus !== "approved").length;
assert(
  manifest.libraryExpansion.status === (pendingExpansionItemCount ? "needs-owner" : "approved"),
  "Library-expansion status does not match its items",
);
const expansionDecision = manifest.contentReview.decisions
  .find((decision) => decision.id === "curated-library-expansion");
assert(
  expansionDecision
    && expansionDecision.reviewStatus === manifest.libraryExpansion.status,
  "Curated Library decision status must match the expansion review",
);
assert(
  manifest.stage === (pendingContentDecisionCount || pendingExpansionItemCount ? "content-review" : "approved"),
  "Manifest stage does not match content-review completion",
);
if (manifest.stage === "approved") {
  assert(pendingRelationshipCount === 0, "An approved manifest cannot contain unapproved relationships");
}

const serializeMasterContent = (master) => ({
  id: master.id,
  name: master.name,
  aliases: master.aliases.map((alias) => alias.name),
  primaryTargets: master.primaryTargets,
  secondaryTargets: master.secondaryTargets,
  movementPattern: master.movementPattern,
  equipment: master.equipment,
  purpose: master.purpose,
  style: master.style,
  laterality: master.laterality,
  support: master.support,
  emphases: master.emphases,
  typicalChallenge: master.typicalChallenge,
  defaultPrescription: master.defaultPrescription,
  instructions: master.instructions,
  videoId: master.videoId,
});
const sourceBackedMasterContentHash = createHash("sha256").update(JSON.stringify(
  manifest.masters.filter((master) => !expansionMasterIds.has(master.id)).map(serializeMasterContent),
)).digest("hex");
assert(
  sourceBackedMasterContentHash === "510c07bf877f4f346cffa1bd64660cb7b18bec9194d1afed9eb3dc3660a198cb",
  "The 169 source-backed masters changed during the bounded Library expansion",
);
const expansionMasterContentHash = createHash("sha256").update(JSON.stringify(
  manifest.masters.filter((master) => expansionMasterIds.has(master.id)).map(serializeMasterContent),
)).digest("hex");
assert(
  expansionMasterContentHash === "8b583248bd781c60e24cd66945c6e8e5bfb6b959510cf37024e6770abd0714e0",
  "Curated Library master content changed without an intentional review-snapshot update",
);
assert(
  manifest.masters.every((master) => master.instructions === "" && master.videoId === ""),
  "The owner source supplies no approved stable master notes or video IDs",
);
assert(manifest.masters.length === 177, "Expected 169 source-backed plus eight curated Library masters");
assert(
  manifest.currentMasters.every((item) => (
    item.resolution.masterIds.every((id) => !expansionMasterIds.has(id))
  )),
  "A curated Library master must not be presented as a current-data disposition",
);
assert(
  manifest.sourceSubjects.every((subject) => (
    subject.resolution.masterIds.every((id) => !expansionMasterIds.has(id))
  )),
  "A curated Library master must not be presented as owner-source content",
);
assert(
  manifest.routines.every((routine) => routine.entries.every((entry) => (
    entry.choices.every((choice) => !expansionMasterIds.has(choice.exerciseId))
  ))),
  "Curated Library expansion must not change any routine choice",
);

const referencedMasterIds = new Set([
  ...manifest.currentMasters.flatMap((item) => item.resolution.masterIds),
  ...manifest.sourceSubjects.flatMap((subject) => subject.resolution.masterIds),
  ...manifest.libraryExpansion.items.map((item) => item.masterId),
]);
for (const id of masterIds) {
  assert(referencedMasterIds.has(id), `Proposed master is not justified by current data or source: ${id}`);
}

const inverseRelation = { easier: "harder", similar: "similar", harder: "easier" };
const relatedById = new Map(manifest.masters.map((master) => [master.id, []]));
for (const relationship of manifest.relationships) {
  relatedById.get(relationship.exerciseId).push({
    exerciseId: relationship.relatedExerciseId,
    relation: relationship.relation,
  });
  relatedById.get(relationship.relatedExerciseId).push({
    exerciseId: relationship.exerciseId,
    relation: inverseRelation[relationship.relation],
  });
}
const expectedStartingState = {
  version: manifest.baseline.schemaVersion,
  exercises: manifest.masters.map((master) => ({
    id: master.id,
    name: master.name,
    aliases: master.aliases.map((alias) => alias.name),
    primaryTargets: master.primaryTargets,
    secondaryTargets: master.secondaryTargets,
    movementPattern: master.movementPattern,
    equipment: master.equipment,
    purpose: master.purpose,
    style: master.style,
    laterality: master.laterality,
    support: master.support,
    emphases: master.emphases,
    typicalChallenge: master.typicalChallenge,
    relatedExercises: relatedById.get(master.id),
    defaultPrescription: master.defaultPrescription,
    instructions: master.instructions,
    videoId: master.videoId,
  })),
  routines: manifest.routines.map((routine) => ({
    id: routine.id,
    name: routine.name,
    group: routine.location,
    status: routine.status,
    note: routine.note,
    blocks: routine.blocks.map(({ id, name }) => ({ id, name })),
    entries: routine.entries.map((entry) => ({
      id: entry.id,
      choices: entry.choices,
      blockId: entry.blockId,
      note: entry.note,
      role: entry.role,
    })),
  })),
  programs: manifest.programs.map((item) => ({
    id: item.id,
    name: item.name,
    note: item.note,
    routineIds: item.routineIds,
  })),
  sessions: {},
  settings: {
    activeProgramId: manifest.programs[0].id,
    activeRoutineId: manifest.programs[0].routineIds[0],
    theme: "light",
  },
};
assert(
  JSON.stringify(currentState) === JSON.stringify(expectedStartingState),
  "Production starting data does not exactly match the approved manifest projection",
);

const ownerQuestions = [
  ...manifest.currentMasters
    .filter((item) => item.resolution.reviewStatus === "needs-owner")
    .map((item) => ({ key: item.key, question: item.resolution.question })),
  ...manifest.sourceSubjects
    .filter((item) => item.resolution.reviewStatus === "needs-owner")
    .map((item) => ({ key: item.key, question: item.resolution.question })),
];
const pendingReviewItems = [
  ...manifest.currentMasters.map((item) => item.resolution.reviewStatus),
  ...manifest.sourceSubjects.map((item) => item.resolution.reviewStatus),
  ...manifest.masters.filter((master) => !expansionMasterIds.has(master.id)).flatMap((master) => [
    master.reviewStatus,
    ...master.aliases.map((alias) => alias.reviewStatus),
  ]),
].filter((status) => status !== "approved").length;
const programDecisions = manifest.programReview.decisions
  .filter((decision) => decision.reviewStatus === "needs-owner")
  .map((decision) => ({ key: decision.id, question: decision.question, recommended: decision.recommended }));
const contentDecisions = manifest.contentReview.decisions
  .filter((decision) => decision.reviewStatus === "needs-owner")
  .map((decision) => ({ key: decision.id, question: decision.question, recommended: decision.recommended }));

console.log("PPLPPL 7 review manifest valid");
console.log(JSON.stringify({
  currentMasters: manifest.currentMasters.length,
  canonicalMasters: manifest.masters.length,
  sourceBackedMasters: manifest.masters.length - expansionMasterIds.size,
  curatedExpansionMasters: expansionMasterIds.size,
  numberedOccurrences: numbered.length,
  uniqueNumberedLabels: new Set(numbered.map((item) => subjectsByKey.get(item.subjectKey).normalizedLabel)).size,
  numberedCompoundCandidates: numberedCompoundCount,
  embeddedDirectives: directives.length,
  mappedPrograms: manifest.programs.length,
  mappedRoutines: manifest.routines.length,
  mappedBlocks: mappedBlockIds.size,
  mappedEntries: mappedEntryCount,
  mappedChoices: mappedChoiceCount,
  aliases: manifest.masters.reduce((count, master) => count + master.aliases.length, 0),
  globalRelationships: manifest.relationships.length,
  pendingIdentityItems: pendingReviewItems,
  pendingExpansionItems: pendingExpansionItemCount,
  pendingProgramDecisions: programDecisions.length,
  pendingContentDecisions: contentDecisions.length,
  pendingRelationships: pendingRelationshipCount,
  identityStatus: pendingReviewItems ? "awaiting owner approval" : "owner approved",
  expansionStatus: pendingExpansionItemCount ? "awaiting owner approval" : "owner approved",
  programStatus: programDecisions.length ? "awaiting owner approval" : "owner approved",
  contentStatus: contentDecisions.length ? "awaiting owner approval" : "owner approved",
}, null, 2));

if (process.argv.includes("--decisions")) {
  [...ownerQuestions, ...programDecisions, ...contentDecisions].forEach((decision, index) => {
    console.log(`${index + 1}. ${decision.key}: ${decision.question}`);
    if (decision.recommended) console.log(`   Recommended: ${decision.recommended}`);
  });
}
