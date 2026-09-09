(function () {
  "use strict";

  const app = document.querySelector("#main");
  const toast = document.querySelector("#toast");
  const calendar = window.DOMIAN_CALENDAR;
  let toastTimer;
  let activeContext;
  let calendarState;
  let observedToday;

  const icons = {
    target: '<svg viewBox="0 0 24 24"><circle cx="11" cy="13" r="7"/><circle cx="11" cy="13" r="3"/><path d="m14 10 6-6m-3 0h3v3"/></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="m12 2 1.4 5.6L19 9l-5.6 1.4L12 16l-1.4-5.6L5 9l5.6-1.4L12 2Z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M5 20v-6m7 6V9m7 11V4"/></svg>',
    network: '<svg viewBox="0 0 24 24"><circle cx="12" cy="6" r="3"/><circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="m10 8-3.5 7m7.5-7 3.5 7M8 18h8"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
    key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="4"/><path d="M12 12h9m-3 0v3m-3-3v2"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M20.8 5.7a5 5 0 0 0-7.1 0L12 7.4l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21l8.8-8.2a5 5 0 0 0 0-7.1Z"/></svg>',
    person: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4.2 3.3-6 8-6s7.3 1.8 8 6"/></svg>',
    wallet: '<svg viewBox="0 0 24 24"><path d="M4 6h14a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12"/><path d="M16 11h6v5h-6a2.5 2.5 0 0 1 0-5Z"/></svg>',
    inbox: '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4zM4 14h5l2 3h2l2-3h5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></svg>',
    focus: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>',
    note: '<svg viewBox="0 0 24 24"><path d="M5 3h14v18H5zM8 8h8m-8 4h8m-8 4h5"/></svg>',
    calendar: '<svg viewBox="0 0 24 24"><path d="M4 6h16v15H4zM8 3v6m8-6v6M4 10h16"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M3 5c4-1 7 0 9 2v14c-2-2-5-3-9-2V5Zm18 0c-4-1-7 0-9 2v14c2-2 5-3 9-2V5Z"/></svg>',
  };

  function icon(name) {
    return `<span class="icon" aria-hidden="true">${icons[name] || icons.spark}</span>`;
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("toast--visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("toast--visible"), 2200);
  }

  function now() {
    const supplied = window.DOMIAN_CLOCK?.now?.();
    return supplied ? new Date(supplied) : new Date();
  }

  function readCalendarState(todayIso) {
    let parsed;
    let legacy;
    try {
      parsed = JSON.parse(localStorage.getItem(calendar.STORAGE_KEY));
      legacy = JSON.parse(localStorage.getItem(calendar.LEGACY_STORAGE_KEY));
    } catch (_) {
      parsed = null;
      legacy = null;
    }
    const normalized = calendar.hydrateState(parsed, legacy, todayIso);
    try {
      localStorage.setItem(calendar.STORAGE_KEY, JSON.stringify(normalized));
    } catch (_) {
      showToast("Прогресс сохранён только до закрытия страницы");
    }
    return normalized;
  }

  function writeCalendarState() {
    try {
      localStorage.setItem(calendar.STORAGE_KEY, JSON.stringify(calendarState));
    } catch (_) {
      showToast("Прогресс сохранён только до закрытия страницы");
    }
  }

  function formatDate(isoDate, withWeekday) {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: "UTC",
      day: "numeric",
      month: "long",
      ...(withWeekday ? { weekday: "long" } : {}),
    }).format(new Date(`${isoDate}T12:00:00Z`));
  }

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function statusSymbol(status) {
    if (status.id === "completed") return "✓";
    if (status.id === "incomplete") return "!";
    if (status.id === "upcoming") return "◷";
    if (status.id === "before-participation") return "—";
    if (status.id === "in-progress") return String(status.done);
    return "○";
  }

  function weekStripMarkup(snapshot, selectedDate, todayIso) {
    const cells = snapshot.entries.map(({ day, isoDate, status }) => {
      const isToday = isoDate === todayIso;
      const isSelected = isoDate === selectedDate;
      const aria = `${day.name}, ${formatDate(isoDate, false)}${isToday ? ", сегодня" : ""}, ${status.label.toLowerCase()}${status.id === "in-progress" ? `, ${status.done} из ${status.total}` : ""}`;
      return `
        <a class="week-day state--${status.id} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}"
          href="#day/${day.id}" aria-label="${aria}" ${isToday ? 'aria-current="date"' : ""}
          style="--day-progress:${status.percent}%">
          <span class="week-day__today">${isToday ? "сегодня" : ""}</span>
          <strong>${day.short}</strong>
          <span class="week-day__status" aria-hidden="true">${statusSymbol(status)}</span>
          <small>${Number(isoDate.slice(-2))}</small>
        </a>`;
    }).join("");
    return `
      <div class="week-calendar__heading">
        <div><span class="eyebrow">Текущая неделя</span><strong>${formatDate(snapshot.weekStart, false)} — ${formatDate(snapshot.weekEnd, false)}</strong></div>
        <span>${snapshot.completed}/7</span>
      </div>
      <nav class="week-strip" aria-label="Календарь рабочей недели">${cells}</nav>
      <div class="week-legend" aria-label="Обозначения статусов">
        <span><i>○</i> Не начато</span><span><i>◐</i> В работе</span><span><i>✓</i> Выполнено</span><span><i>!</i> Не завершено</span><span><i>◷</i> Предстоит</span><span><i>—</i> До участия</span>
      </div>`;
  }

  function wednesdayArt() {
    return `
      <div class="mission-art mission-art--wednesday" role="img" aria-label="Этапы движения объекта и выделенная точка остановки">
        <svg viewBox="0 0 220 150" aria-hidden="true">
          <defs>
            <linearGradient id="flow" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#52dcff"/><stop offset="1" stop-color="#0877c8"/></linearGradient>
            <radialGradient id="stop"><stop stop-color="#ffd98d"/><stop offset=".6" stop-color="#ff9a46"/><stop offset="1" stop-color="#bd482d"/></radialGradient>
            <filter id="cyanGlow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <path class="mission-flow" d="M24 102 C52 46 91 126 117 70 S171 39 198 66"/>
          <g class="mission-nodes" filter="url(#cyanGlow)">
            <circle cx="24" cy="102" r="8"/><circle cx="66" cy="77" r="8"/><circle cx="108" cy="82" r="8"/><circle class="stop-node" cx="144" cy="48" r="16"/><circle cx="176" cy="48" r="8"/><circle cx="198" cy="66" r="8"/>
          </g>
          <path class="stop-mark" d="m137 41 14 14m0-14-14 14"/>
          <path class="scan-line" d="M18 122h184"/>
          <text x="18" y="140">ДВИЖЕНИЕ ОБЪЕКТА</text>
        </svg>
      </div>`;
  }

  function missionArt(day) {
    if (day.id === "wednesday") return wednesdayArt();
    return `<div class="mission-art mission-art--token" role="img" aria-label="Символ миссии: ${day.title}"><span></span>${icon(day.icon)}<small>${day.short}</small></div>`;
  }

  function detailMarkup(item) {
    const items = item.items ? `<ul>${item.items.map((text) => `<li>${text}</li>`).join("")}</ul>` : "";
    const groups = item.groups
      ? `<div class="detail-groups">${item.groups.map(([title, text]) => `<div><strong>${title}</strong><p>${text}</p></div>`).join("")}</div>`
      : "";
    const template = item.template
      ? `<div class="work-template"><pre>${item.template}</pre><button class="template-copy" type="button" data-copy-template="${activeContext.templates.push(item.template) - 1}">${icon("copy")}<span>Скопировать шаблон</span></button></div>`
      : "";
    const source = item.source ? `<p class="detail-source">${item.source}</p>` : "";
    return `<details class="accordion"><summary><span>${item.title}</span><i aria-hidden="true"></i></summary><div class="accordion__body">${item.lead ? `<p>${item.lead}</p>` : ""}${items}${groups}${template}${source}</div></details>`;
  }

  function weekResultMarkup(snapshot) {
    const nextFullWeek = formatDate(calendarState.firstFullWeekStart, false);
    if (snapshot.outcome === "first-partial") {
      return `
        <section id="week-result" class="week-result week-result--partial" tabindex="-1">
          <div class="week-result__score"><strong>${snapshot.completed}</strong><span>миссий<br>завершено</span></div>
          <div><span class="eyebrow">Мягкий старт</span><h2>Первая неделя — знакомство с ритмом</h2><p>Предыдущие дни отмечены «До начала участия» и не считаются пропуском. Полный недельный результат начнётся ${nextFullWeek}.</p></div>
        </section>`;
    }
    if (snapshot.outcome === "victory") {
      return `
        <section id="week-result" class="week-result week-result--victory" tabindex="-1">
          <div class="week-result__score"><strong>7<span>/7</span></strong><i>✓</i></div>
          <div><span class="eyebrow">Неделя завершена</span><h2>Недельная победа</h2><p>Все семь дневных миссий выполнены. Результат сохранён по календарным датам этой недели.</p></div>
        </section>`;
    }
    if (snapshot.outcome === "finished") {
      const missed = snapshot.entries.filter((entry) => entry.status.id !== "completed").map((entry) => entry.day.name.toLowerCase()).join(", ");
      return `
        <section id="week-result" class="week-result week-result--finished" tabindex="-1">
          <div class="week-result__score"><strong>${snapshot.completed}<span>/7</span></strong></div>
          <div><span class="eyebrow">Неделя завершена</span><h2>Фактический результат</h2><p>Завершено ${snapshot.completed} из 7. Не завершены: ${missed}. Новый цикл начнётся в понедельник — без обнуления истории.</p></div>
        </section>`;
    }
    return `
      <section id="week-result" class="week-result" tabindex="-1">
        <div class="week-result__score"><strong>${snapshot.completed}<span>/7</span></strong></div>
        <div><span class="eyebrow">Неделя в работе</span><h2>Каждый завершённый день остаётся в календаре</h2><p>Итог появится после завершения недели. Пропуск не блокирует следующие миссии.</p></div>
      </section>`;
  }

  function buildContext(dayId) {
    const today = calendar.datePartsInMoscow(now());
    observedToday = today.isoDate;
    calendarState = readCalendarState(today.isoDate);
    const dayIndex = window.WEEK_DAYS.findIndex((day) => day.id === dayId);
    const day = window.WEEK_DAYS[dayIndex];
    const data = window.DAY_CONTENT[dayId];
    const selectedDate = calendar.dateForDay(today.weekStart, dayIndex);
    const { version: contentVersion, taskList } = calendar.tasksForDate(
      calendarState,
      selectedDate,
      dayId,
      window.DAY_CONTENT,
      window.CONTENT_VERSION,
    );
    const status = calendar.statusForDate({
      state: calendarState,
      isoDate: selectedDate,
      todayIso: today.isoDate,
      dayId,
      taskList,
      contentVersion,
    });
    const snapshot = calendar.weekSnapshot({
      state: calendarState,
      weekStart: today.weekStart,
      todayIso: today.isoDate,
      days: window.WEEK_DAYS,
      content: window.DAY_CONTENT,
      currentContentVersion: window.CONTENT_VERSION,
    });
    return {
      today,
      dayIndex,
      day,
      data,
      selectedDate,
      status,
      snapshot,
      taskList,
      contentVersion,
      isLegacyContent: contentVersion === calendar.LEGACY_CONTENT_VERSION,
      editable: selectedDate === today.isoDate,
      templates: [],
    };
  }

  function renderDay(dayId) {
    activeContext = buildContext(dayId);
    const { today, dayIndex, day, data, selectedDate, status, snapshot, editable, taskList, contentVersion, isLegacyContent } = activeContext;
    const checked = calendar.checkedTaskIds(calendarState, selectedDate, dayId, taskList, contentVersion);
    const previous = window.WEEK_DAYS[dayIndex - 1];
    const next = window.WEEK_DAYS[dayIndex + 1];
    const isToday = selectedDate === today.isoDate;
    const temporalLabel = isToday ? "Сегодня" : selectedDate < today.isoDate ? "Прошедший день" : "Предстоящий день";
    const backLink = isToday ? "" : '<a class="back-link back-link--compact" href="#home">← К сегодняшней миссии</a>';
    const readOnlyText = selectedDate < today.isoDate
      ? "Этот день прошёл. Можно посмотреть задания и сохранённые отметки."
      : "Задания можно посмотреть заранее. Отмечать выполнение — в этот день.";
    const readOnlyNote = editable ? "" : `<div class="readonly-note">${icon("clock")}<span><strong>Режим просмотра.</strong> ${readOnlyText}</span></div>`;
    const legacyNote = isLegacyContent
      ? `<div class="revision-note">Показана прежняя редакция заданий для этой даты. Сохранённые отметки не перенесены на новые по смыслу действия.</div>`
      : "";
    const checklistMarkup = taskList.map((task, index) => {
      const taskId = isLegacyContent ? String(index) : task.id;
      const label = isLegacyContent ? task : task.label;
      const helper = isLegacyContent ? "" : `<span class="check-item__helper">${task.helper}</span>`;
      const doneWhen = isLegacyContent ? "" : `<details class="task-criterion"><summary>Когда отмечать?</summary><p>${task.doneWhen}</p></details>`;
      const isDone = checked.includes(taskId);
      return `
        <article class="check-item ${isDone ? "is-done" : ""} ${editable ? "" : "is-readonly"}">
          <label class="check-item__action">
            <input type="checkbox" data-task-id="${taskId}" ${isDone ? "checked" : ""} ${editable ? "" : "disabled"} />
            <span class="custom-check" aria-hidden="true"></span>
            <span class="check-item__copy"><strong>${label}</strong>${helper}</span>
            <small>${isDone ? "Выполнено" : ""}</small>
          </label>
          ${doneWhen}
        </article>`;
    }).join("");

    app.innerHTML = `
      <section class="mission-panel page-enter ${isToday ? "is-today" : "is-viewing"} ${status.id === "completed" ? "is-complete" : ""}">
        ${backLink}
        <div class="mission-meta">
          <span>${temporalLabel} · ${capitalize(formatDate(selectedDate, true))}</span>
          <span id="mission-status" class="mission-status state--${status.id}">${status.label}</span>
        </div>
        <div class="mission-main">
          <div class="mission-copy">
            <span class="eyebrow">${day.name} · ${day.title}</span>
            <h1>${day.promise}</h1>
            <p>${data.subtitle}</p>
          </div>
          ${missionArt(day)}
        </div>
        <div class="mission-progress">
          <div><span>Прогресс миссии</span><strong id="progress-text">${status.done}/${status.total}</strong></div>
          <div id="progress-track" class="progress-track" role="progressbar" aria-label="Прогресс миссии: ${day.name}" aria-valuemin="0" aria-valuemax="${status.total}" aria-valuenow="${status.done}"><span id="progress-bar" style="width:${status.percent}%"></span></div>
          <small id="progress-label">${status.done === status.total ? "Миссия выполнена" : `Следующее действие · осталось ${status.total - status.done}`}</small>
        </div>
        <div id="week-calendar" class="week-calendar">${weekStripMarkup(snapshot, selectedDate, today.isoDate)}</div>
      </section>

      <section class="day-section checklist-section ${status.id === "completed" ? "is-complete" : ""}" aria-labelledby="checklist-title">
        <div class="day-section__heading checklist-heading">${icon("check")}<div><span class="eyebrow">Чек-лист руководителя</span><h2 id="checklist-title">Что проверить сегодня</h2><p>Отмечайте пункт, когда выполнено действие и проверен результат.</p></div></div>
        ${readOnlyNote}
        ${legacyNote}
        <div class="checklist">${checklistMarkup}</div>
        <div id="result-note" class="result-note ${status.id === "completed" ? "is-achieved" : ""}"><span aria-hidden="true">${status.id === "completed" ? "✓" : "→"}</span><div><strong>${status.id === "completed" ? "Результат достигнут" : "Ожидаемый результат"}</strong><p>${data.result}</p></div></div>
        <div id="completion-panel" class="completion-panel" aria-live="polite" ${status.id === "completed" ? "" : "hidden"}>
          ${icon(day.icon)}
          <div><span class="eyebrow">Чек-лист дня завершён</span><h3>${data.title}: день завершён</h3><p>Ваши ${taskList.length} отметок за ${formatDate(selectedDate, false)} сохранены в этом браузере.</p></div>
          <button class="button button--primary" type="button" data-scroll-week>К результату недели <span aria-hidden="true">↓</span></button>
        </div>
        ${editable ? `
          <button id="reset-progress" class="text-button" type="button">↻ Сбросить отметки за сегодня</button>
          <div id="reset-confirm" class="reset-confirm" hidden role="group" aria-label="Подтверждение сброса">
            <span>Снять все отметки за сегодня? Тексты заданий останутся.</span>
            <button id="confirm-reset" type="button">Да, сбросить</button><button id="cancel-reset" type="button">Отмена</button>
          </div>` : ""}
      </section>

      <div id="week-result-wrap">${weekResultMarkup(snapshot)}</div>

      <section class="day-section message-section" aria-labelledby="message-title">
        <div class="day-section__heading">${icon("copy")}<div><span class="eyebrow">Готово к отправке</span><h2 id="message-title">Сообщение агентам</h2><p>Кнопка только копирует сообщение — приложение ничего не отправляет.</p></div></div>
        <div id="office-message" class="message-box">${data.message.replaceAll("\n", "<br>")}</div>
        <button id="copy-message" class="button button--primary button--wide" type="button">${icon("copy")} <span class="button-label">Скопировать сообщение</span></button>
      </section>

      <section class="day-section tips-section" aria-labelledby="tips-title">
        <div class="day-section__heading">${icon("spark")}<div><span class="eyebrow">На практике</span><h2 id="tips-title">Быстрые подсказки</h2></div></div>
        <div class="tips-grid">${data.tips.map((tip) => `<article>${icon(tip.icon)}<div><h3>${tip.title}</h3><p>${tip.text}</p></div></article>`).join("")}</div>
      </section>

      <section class="day-section overview" aria-labelledby="overview-title">
        <div class="day-section__heading">${icon("target")}<div><span class="eyebrow">Контекст</span><h2 id="overview-title">Что это за день</h2><p>${data.intro}</p></div></div>
        <div class="principles">${data.principles.map((principle) => `<article>${icon(principle.icon)}<h3>${principle.title}</h3><p>${principle.text}</p></article>`).join("")}</div>
        <div class="scope-note"><strong>Объём работы</strong><p>${data.scope}</p></div>
      </section>

      <section class="day-section details-section" aria-labelledby="details-title">
        <div class="day-section__heading">${icon("book")}<div><span class="eyebrow">Второй уровень</span><h2 id="details-title">Как сделать</h2><p>${data.help}</p></div></div>
        <div class="accordions">${data.details.map(detailMarkup).join("")}${detailMarkup(window.GENERAL_HELP)}${detailMarkup({ title: "Коротко о терминах", groups: window.TERM_DEFINITIONS })}</div>
      </section>

      <section class="day-section book-section" aria-labelledby="book-title">
        <div class="day-section__heading">${icon("book")}<div><span class="eyebrow">Первоисточник</span><h2 id="book-title">Книга 2.0</h2><p>Подробнее в книге: ${data.source}. Номер страницы указан и в подписи, если просмотрщик не поддерживает прямой переход.</p></div></div>
        <div class="book-actions">
          <a class="button button--primary" href="${window.BOOK_INFO.href}#page=${data.bookPage}" target="_blank" rel="noopener">Открыть со страницы ${data.bookPage}</a>
          <a class="button button--secondary" href="${window.BOOK_INFO.href}" target="_blank" rel="noopener">Открыть всю книгу · версия 2.0</a>
        </div>
      </section>

      <nav class="day-navigation" aria-label="Навигация по дням">
        <a class="button button--secondary" href="${previous ? `#day/${previous.id}` : "#home"}">${previous ? "← Предыдущий день" : "← Сегодня"}</a>
        <a class="button button--primary" href="${next ? `#day/${next.id}` : "#home"}">${next ? "Следующий день" : "К сегодняшней миссии"} <span aria-hidden="true">→</span></a>
      </nav>`;

    bindDayEvents();
  }

  function bindDayEvents() {
    document.querySelectorAll("[data-task-id]:not(:disabled)").forEach((input) => input.addEventListener("change", handleCheck));
    document.querySelector("#copy-message")?.addEventListener("click", copyMessage);
    document.querySelectorAll("[data-copy-template]").forEach((button) => button.addEventListener("click", copyTemplate));
    document.querySelector("#reset-progress")?.addEventListener("click", openResetConfirmation);
    document.querySelector("#confirm-reset")?.addEventListener("click", confirmReset);
    document.querySelector("#cancel-reset")?.addEventListener("click", cancelReset);
    document.querySelector("[data-scroll-week]")?.addEventListener("click", scrollToWeekResult);
  }

  function updateLiveUi(announceCompletion) {
    const { day, selectedDate, today, taskList, contentVersion } = activeContext;
    const status = calendar.statusForDate({ state: calendarState, isoDate: selectedDate, todayIso: today.isoDate, dayId: day.id, taskList, contentVersion });
    const snapshot = calendar.weekSnapshot({ state: calendarState, weekStart: today.weekStart, todayIso: today.isoDate, days: window.WEEK_DAYS, content: window.DAY_CONTENT, currentContentVersion: window.CONTENT_VERSION });
    activeContext.status = status;
    activeContext.snapshot = snapshot;
    const remaining = status.total - status.done;

    document.querySelector("#progress-text").textContent = `${status.done}/${status.total}`;
    document.querySelector("#progress-label").textContent = remaining === 0 ? "Миссия выполнена" : `Следующее действие · осталось ${remaining}`;
    document.querySelector("#progress-bar").style.width = `${status.percent}%`;
    document.querySelector("#progress-track").setAttribute("aria-valuenow", String(status.done));
    document.querySelector("#mission-status").className = `mission-status state--${status.id}`;
    document.querySelector("#mission-status").textContent = status.label;
    document.querySelector(".mission-panel").classList.toggle("is-complete", status.id === "completed");
    document.querySelector(".checklist-section").classList.toggle("is-complete", status.id === "completed");
    document.querySelectorAll("[data-task-id]").forEach((input) => {
      const row = input.closest(".check-item");
      row.classList.toggle("is-done", input.checked);
      row.querySelector(".check-item__action small").textContent = input.checked ? "Выполнено" : "";
    });

    const result = document.querySelector("#result-note");
    result.classList.toggle("is-achieved", status.id === "completed");
    result.querySelector(":scope > span").textContent = status.id === "completed" ? "✓" : "→";
    result.querySelector("strong").textContent = status.id === "completed" ? "Результат достигнут" : "Ожидаемый результат";
    document.querySelector("#completion-panel").hidden = status.id !== "completed";
    document.querySelector("#week-calendar").innerHTML = weekStripMarkup(snapshot, selectedDate, today.isoDate);
    document.querySelector("#week-result-wrap").innerHTML = weekResultMarkup(snapshot);
    document.querySelector("[data-scroll-week]")?.addEventListener("click", scrollToWeekResult);

    if (announceCompletion && status.id === "completed") showToast("Миссия дня выполнена");
  }

  function handleCheck(event) {
    if (!activeContext.editable) return;
    const taskId = event.currentTarget.dataset.taskId;
    calendarState = calendar.setTask(calendarState, activeContext.selectedDate, activeContext.day.id, taskId, event.currentTarget.checked, activeContext.contentVersion);
    writeCalendarState();
    updateLiveUi(true);
  }

  function openResetConfirmation() {
    const confirm = document.querySelector("#reset-confirm");
    confirm.hidden = false;
    document.querySelector("#confirm-reset").focus();
  }

  function cancelReset() {
    document.querySelector("#reset-confirm").hidden = true;
    document.querySelector("#reset-progress").focus();
    showToast("Сброс отменён");
  }

  function confirmReset() {
    calendarState = calendar.resetDay(calendarState, activeContext.selectedDate, activeContext.day.id, activeContext.contentVersion);
    writeCalendarState();
    document.querySelectorAll("[data-task-id]").forEach((input) => { input.checked = false; });
    document.querySelector("#reset-confirm").hidden = true;
    updateLiveUi(false);
    document.querySelector("#reset-progress").focus();
    showToast("Сегодняшний прогресс сброшен");
  }

  function scrollToWeekResult() {
    const target = document.querySelector("#week-result");
    target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    target.focus({ preventScroll: true });
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.append(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    if (!copied) throw new Error("copy failed");
  }

  async function copyTemplate(event) {
    const button = event.currentTarget;
    const text = activeContext.templates[Number(button.dataset.copyTemplate)];
    try {
      await copyText(text);
      button.classList.add("is-success");
      button.querySelector("span").textContent = "Шаблон скопирован";
      showToast("Шаблон скопирован");
      window.setTimeout(() => {
        if (!button.isConnected) return;
        button.classList.remove("is-success");
        button.querySelector("span").textContent = "Скопировать шаблон";
      }, 2200);
    } catch (_) {
      showToast("Не удалось скопировать — выделите шаблон вручную");
    }
  }

  async function copyMessage() {
    const text = activeContext.data.message;
    const button = document.querySelector("#copy-message");
    try {
      await copyText(text);
      button.classList.add("is-success");
      button.querySelector(".button-label").textContent = "Скопировано";
      showToast("Скопировано. Вставьте текст в чат команды.");
      window.setTimeout(() => {
        if (!button.isConnected) return;
        button.classList.remove("is-success");
        button.querySelector(".button-label").textContent = "Скопировать сообщение";
      }, 2200);
    } catch (_) {
      showToast("Не удалось скопировать — выделите текст вручную");
    }
  }

  function route() {
    const today = calendar.datePartsInMoscow(now());
    const hash = location.hash || "#home";
    let dayId = window.WEEK_DAYS[today.dayIndex].id;
    if (hash.startsWith("#day/")) {
      const requested = hash.replace("#day/", "").split("?")[0];
      if (window.DAY_CONTENT[requested]) dayId = requested;
    }
    renderDay(dayId);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function checkDateRollover() {
    const current = calendar.datePartsInMoscow(now()).isoDate;
    if (observedToday && current !== observedToday) route();
  }

  window.addEventListener("hashchange", route);
  window.addEventListener("focus", checkDateRollover);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) checkDateRollover(); });
  window.setInterval(checkDateRollover, 60000);
  route();
})();
