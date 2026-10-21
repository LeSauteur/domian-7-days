"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function exportDays() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../data/days.js"), "utf8"), context);
  const source = context.window;
  return {
    schema_version: 1,
    content_version: source.CONTENT_VERSION,
    days: source.WEEK_DAYS.map(({ id, short, name, title, promise }) => ({
      id, short, name, title, promise,
      checklist: source.DAY_CONTENT[id].checklist.map(({ id, label, helper, doneWhen }) => ({
        id, label, helper, doneWhen,
      })),
    })),
  };
}

if (require.main === module) {
  const target = path.join(__dirname, "../data/days.json");
  const expected = JSON.stringify(exportDays(), null, 2) + "\n";
  if (process.argv.includes("--check")) {
    if (fs.readFileSync(target, "utf8").replace(/\r\n/g, "\n") !== expected) {
      throw new Error("data/days.json устарел. Выполните node scripts/export-days.js");
    }
    console.log("days.json соответствует days.js");
  } else {
    fs.writeFileSync(target, expected);
    console.log("Создан data/days.json");
  }
}

module.exports = { exportDays };
