"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const calendar = require("../js/calendar.js");
const { exportDays } = require("../scripts/export-days.js");
const data = JSON.parse(fs.readFileSync(require("node:path").join(__dirname, "../data/days.json"), "utf8"));
assert.equal(JSON.stringify(data), JSON.stringify(exportDays()), "Экспорт должен соответствовать исходным данным");
assert.deepEqual(data.days.map(day => day.id), calendar.DAY_IDS);
assert.ok(data.content_version);
for (const day of data.days) {
  assert.ok(day.title && day.promise && day.checklist.length);
  assert.equal(new Set(day.checklist.map(task => task.id)).size, day.checklist.length);
  const date = "2026-10-21";
  const state = calendar.setTask({ version: 3, days: {} }, date, day.id, day.checklist[0].id, true, data.content_version);
  assert.equal(calendar.checkedTaskIds(state, date, day.id, day.checklist, data.content_version).length, 1);
}
console.log("Экспорт семи дней и совместимость отметок проверены");
