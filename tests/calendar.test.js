"use strict";

const assert = require("node:assert/strict");
const calendar = require("../js/calendar.js");

const contentVersion = "editorial-test";
const days = calendar.DAY_IDS.map((id, index) => ({ id, name: id, short: String(index + 1) }));
const taskList = [{ id: "a" }, { id: "b" }];
const content = Object.fromEntries(days.map((day) => [day.id, { checklist: taskList, legacyChecklist: ["old a", "old b"] }]));

function completeDate(state, isoDate, dayId) {
  let next = state;
  next = calendar.setTask(next, isoDate, dayId, "a", true, contentVersion);
  next = calendar.setTask(next, isoDate, dayId, "b", true, contentVersion);
  return next;
}

assert.equal(calendar.datePartsInMoscow("2026-09-08T20:59:59Z").isoDate, "2026-09-08", "Moscow date before midnight");
assert.equal(calendar.datePartsInMoscow("2026-09-08T21:00:00Z").isoDate, "2026-09-09", "Moscow date after midnight");
assert.equal(calendar.datePartsInMoscow("2026-09-09T09:00:00Z").dayIndex, 2, "Wednesday opens Wednesday");
assert.equal(calendar.datePartsInMoscow("2026-09-13T20:59:59Z").dayIndex, 6, "Sunday before Moscow midnight");
assert.equal(calendar.datePartsInMoscow("2026-09-13T21:00:00Z").dayIndex, 0, "Sunday rolls to Monday in Moscow");
assert.equal(calendar.weekStartFor("2027-01-03"), "2026-12-28", "Week boundary across a year");
assert.equal(calendar.addDays("2027-01-03", 1), "2027-01-04", "Sunday to Monday across a year");

const firstWednesday = calendar.initialState("2026-09-09");
assert.equal(firstWednesday.participationStart, "2026-09-09");
assert.equal(firstWednesday.firstFullWeekStart, "2026-09-14", "Midweek join starts full result next Monday");
assert.equal(calendar.statusForDate({ state: firstWednesday, isoDate: "2026-09-07", todayIso: "2026-09-09", dayId: "monday", taskList, contentVersion }).id, "before-participation");
assert.equal(calendar.weekSnapshot({ state: firstWednesday, weekStart: "2026-09-07", todayIso: "2026-09-09", days, content, currentContentVersion: contentVersion }).outcome, "first-partial", "First partial week is not a loss");

const legacy = calendar.normalizeState({ version: 1, monday: [0, 1] }, "2026-09-09");
assert.deepEqual(legacy.days, {}, "Undated legacy progress is not imported");

let separated = calendar.initialState("2026-09-14");
separated = calendar.setTask(separated, "2026-09-14", "monday", "a", true, contentVersion);
assert.deepEqual(calendar.checkedTaskIds(separated, "2026-09-14", "monday", taskList, contentVersion), ["a"]);
assert.deepEqual(calendar.checkedTaskIds(separated, "2026-09-15", "tuesday", taskList, contentVersion), [], "Progress is separated by date and task");
assert.equal(calendar.statusForDate({ state: separated, isoDate: "2026-09-18", todayIso: "2026-09-18", dayId: "friday", taskList, contentVersion }).id, "not-started", "Earlier miss does not lock today");

const oldV2 = {
  version: 2,
  participationStart: "2026-09-07",
  firstFullWeekStart: "2026-09-07",
  days: { "2026-09-09": { tasks: { "wednesday:0": true, "wednesday:1": true } } },
};
const migrated = calendar.hydrateState(null, oldV2, "2026-09-09");
assert.equal(migrated.version, 3, "Dated v2 state migrates to v3");
assert.equal(calendar.contentVersionForDate(migrated, "2026-09-09", contentVersion), calendar.LEGACY_CONTENT_VERSION, "Started day keeps legacy content");
assert.deepEqual(calendar.checkedTaskIds(migrated, "2026-09-09", "wednesday", content.wednesday.legacyChecklist, calendar.LEGACY_CONTENT_VERSION), ["0", "1"], "Old checks stay on old task indexes");
assert.deepEqual(calendar.checkedTaskIds(migrated, "2026-09-10", "thursday", taskList, contentVersion), [], "Old checks never appear on new meaning");
assert.equal(oldV2.version, 2, "Legacy source object remains unchanged");

let victory = calendar.initialState("2026-09-14");
days.forEach((day, index) => { victory = completeDate(victory, calendar.dateForDay("2026-09-14", index), day.id); });
assert.equal(calendar.weekSnapshot({ state: victory, weekStart: "2026-09-14", todayIso: "2026-09-20", days, content, currentContentVersion: contentVersion }).outcome, "victory");

let missed = calendar.initialState("2026-09-14");
days.forEach((day, index) => { if (index !== 2) missed = completeDate(missed, calendar.dateForDay("2026-09-14", index), day.id); });
const missedSnapshot = calendar.weekSnapshot({ state: missed, weekStart: "2026-09-14", todayIso: "2026-09-21", days, content, currentContentVersion: contentVersion });
assert.equal(missedSnapshot.outcome, "finished");
assert.equal(missedSnapshot.completed, 6);

console.log("Calendar tests passed: 22 assertions");
