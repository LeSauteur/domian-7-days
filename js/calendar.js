(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DOMIAN_CALENDAR = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TIME_ZONE = "Europe/Moscow";
  const STORAGE_KEY = "domian:calendar:v3";
  const LEGACY_STORAGE_KEY = "domian:calendar:v2";
  const LEGACY_CONTENT_VERSION = "legacy-v2";
  const DAY_IDS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  function isoFromParts(year, month, day) {
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function datePartsInMoscow(input) {
    const date = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const isoDate = isoFromParts(Number(values.year), Number(values.month), Number(values.day));
    return {
      isoDate,
      dayIndex: weekdayIndex(isoDate),
      weekStart: weekStartFor(isoDate),
    };
  }

  function parseIso(isoDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate || "");
    if (!match) throw new Error(`Invalid ISO date: ${isoDate}`);
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }

  function addDays(isoDate, amount) {
    const date = parseIso(isoDate);
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
  }

  function weekdayIndex(isoDate) {
    const sundayFirst = parseIso(isoDate).getUTCDay();
    return (sundayFirst + 6) % 7;
  }

  function weekStartFor(isoDate) {
    return addDays(isoDate, -weekdayIndex(isoDate));
  }

  function dateForDay(weekStart, dayIndex) {
    return addDays(weekStart, dayIndex);
  }

  function initialState(todayIso) {
    const weekStart = weekStartFor(todayIso);
    const firstFullWeekStart = weekdayIndex(todayIso) === 0 ? weekStart : addDays(weekStart, 7);
    return {
      version: 3,
      participationStart: todayIso,
      firstFullWeekStart,
      days: {},
    };
  }

  function normalizeState(value, todayIso) {
    if (!value || value.version !== 3 || typeof value.days !== "object") return initialState(todayIso);
    const participationStart = /^\d{4}-\d{2}-\d{2}$/.test(value.participationStart || "")
      ? value.participationStart
      : todayIso;
    const fallbackFullWeek = weekdayIndex(participationStart) === 0
      ? weekStartFor(participationStart)
      : addDays(weekStartFor(participationStart), 7);
    const normalizedDays = {};
    Object.entries(value.days).forEach(([date, record]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !record || typeof record.tasks !== "object") return;
      const tasks = {};
      Object.entries(record.tasks).forEach(([key, done]) => {
        if (done === true) tasks[key] = true;
      });
      normalizedDays[date] = {
        contentVersion: typeof record.contentVersion === "string" ? record.contentVersion : LEGACY_CONTENT_VERSION,
        tasks,
      };
    });
    return {
      version: 3,
      participationStart,
      firstFullWeekStart: /^\d{4}-\d{2}-\d{2}$/.test(value.firstFullWeekStart || "")
        ? value.firstFullWeekStart
        : fallbackFullWeek,
      days: normalizedDays,
    };
  }

  function migrateLegacyState(value, todayIso) {
    if (!value || value.version !== 2 || typeof value.days !== "object") return initialState(todayIso);
    const migrated = initialState(todayIso);
    migrated.participationStart = /^\d{4}-\d{2}-\d{2}$/.test(value.participationStart || "")
      ? value.participationStart
      : todayIso;
    migrated.firstFullWeekStart = /^\d{4}-\d{2}-\d{2}$/.test(value.firstFullWeekStart || "")
      ? value.firstFullWeekStart
      : (weekdayIndex(migrated.participationStart) === 0
        ? weekStartFor(migrated.participationStart)
        : addDays(weekStartFor(migrated.participationStart), 7));
    Object.entries(value.days).forEach(([date, record]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !record || typeof record.tasks !== "object") return;
      const tasks = {};
      Object.entries(record.tasks).forEach(([key, done]) => {
        if (done === true) tasks[key] = true;
      });
      migrated.days[date] = { contentVersion: LEGACY_CONTENT_VERSION, tasks };
    });
    return migrated;
  }

  function hydrateState(currentValue, legacyValue, todayIso) {
    if (currentValue?.version === 3) return normalizeState(currentValue, todayIso);
    if (legacyValue?.version === 2) return migrateLegacyState(legacyValue, todayIso);
    return initialState(todayIso);
  }

  function contentVersionForDate(state, isoDate, currentContentVersion) {
    return state.days?.[isoDate]?.contentVersion || currentContentVersion;
  }

  function taskKey(dayId, taskId, contentVersion) {
    return contentVersion === LEGACY_CONTENT_VERSION
      ? `${dayId}:${taskId}`
      : `${dayId}:${contentVersion}:${taskId}`;
  }

  function taskIdAt(task, index, contentVersion) {
    return contentVersion === LEGACY_CONTENT_VERSION ? String(index) : String(task.id);
  }

  function checkedTaskIds(state, isoDate, dayId, taskList, contentVersion) {
    const stored = state.days?.[isoDate]?.tasks || {};
    return taskList
      .map((task, index) => taskIdAt(task, index, contentVersion))
      .filter((taskId) => stored[taskKey(dayId, taskId, contentVersion)] === true);
  }

  function setTask(state, isoDate, dayId, taskId, done, contentVersion) {
    const next = normalizeState(state, isoDate);
    const record = next.days[isoDate] || { contentVersion, tasks: {} };
    const tasks = { ...record.tasks };
    const revision = record.contentVersion || contentVersion;
    const key = taskKey(dayId, taskId, revision);
    if (done) tasks[key] = true;
    else delete tasks[key];
    next.days = { ...next.days, [isoDate]: { contentVersion: revision, tasks } };
    return next;
  }

  function resetDay(state, isoDate, dayId, contentVersion) {
    const next = normalizeState(state, isoDate);
    const record = next.days[isoDate] || { contentVersion, tasks: {} };
    const revision = record.contentVersion || contentVersion;
    const prefix = revision === LEGACY_CONTENT_VERSION ? `${dayId}:` : `${dayId}:${revision}:`;
    const tasks = Object.fromEntries(Object.entries(record.tasks).filter(([key]) => !key.startsWith(prefix)));
    next.days = { ...next.days, [isoDate]: { contentVersion: revision, tasks } };
    return next;
  }

  function progressFor(state, isoDate, dayId, taskList, contentVersion) {
    const total = taskList.length;
    const done = checkedTaskIds(state, isoDate, dayId, taskList, contentVersion).length;
    return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
  }

  function statusForDate({ state, isoDate, todayIso, dayId, taskList, contentVersion }) {
    const progress = progressFor(state, isoDate, dayId, taskList, contentVersion);
    if (isoDate < state.participationStart) return { id: "before-participation", label: "До начала участия", ...progress };
    if (isoDate > todayIso) return { id: "upcoming", label: "Предстоит", ...progress };
    if (isoDate < todayIso) {
      return progress.done === progress.total
        ? { id: "completed", label: "Выполнено", ...progress }
        : { id: "incomplete", label: "Не завершено", ...progress };
    }
    if (progress.done === progress.total) return { id: "completed", label: "Выполнено", ...progress };
    if (progress.done > 0) return { id: "in-progress", label: "В работе", ...progress };
    return { id: "not-started", label: "Не начато", ...progress };
  }

  function tasksForDate(state, isoDate, dayId, content, currentContentVersion) {
    const version = contentVersionForDate(state, isoDate, currentContentVersion);
    const taskList = version === LEGACY_CONTENT_VERSION
      ? content[dayId].legacyChecklist
      : content[dayId].checklist;
    return { version, taskList };
  }

  function weekSnapshot({ state, weekStart, todayIso, days, content, currentContentVersion }) {
    const entries = days.map((day, index) => {
      const isoDate = dateForDay(weekStart, index);
      const { version, taskList } = tasksForDate(state, isoDate, day.id, content, currentContentVersion);
      return {
        day,
        isoDate,
        status: statusForDate({ state, isoDate, todayIso, dayId: day.id, taskList, contentVersion: version }),
      };
    });
    const completed = entries.filter((entry) => entry.status.id === "completed").length;
    const weekEnd = dateForDay(weekStart, 6);
    const fullParticipation = weekStart >= state.firstFullWeekStart;
    const sundayComplete = todayIso === weekEnd && entries[6].status.id === "completed";
    const ended = todayIso > weekEnd || sundayComplete;
    let outcome = "ongoing";
    if (!fullParticipation) outcome = "first-partial";
    else if (ended && completed === 7) outcome = "victory";
    else if (ended) outcome = "finished";
    return { entries, completed, weekStart, weekEnd, fullParticipation, ended, outcome };
  }

  return {
    TIME_ZONE,
    STORAGE_KEY,
    LEGACY_STORAGE_KEY,
    LEGACY_CONTENT_VERSION,
    DAY_IDS,
    addDays,
    checkedTaskIds,
    contentVersionForDate,
    dateForDay,
    datePartsInMoscow,
    hydrateState,
    initialState,
    normalizeState,
    progressFor,
    resetDay,
    setTask,
    statusForDate,
    taskKey,
    tasksForDate,
    weekdayIndex,
    weekSnapshot,
    weekStartFor,
  };
});
