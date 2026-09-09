(function () {
  "use strict";

  const app = document.querySelector("#main");
  const toast = document.querySelector("#toast");
  let activeDayId = "monday";
  let toastTimer;
  let resetTimer;

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

  function storageKey(dayId) {
    return `domian:${dayId}:checklist:v1`;
  }

  function readChecks(dayId) {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(dayId)));
      return Array.isArray(saved) ? saved : [];
    } catch (_) {
      return [];
    }
  }

  function writeChecks(dayId, checks) {
    try {
      localStorage.setItem(storageKey(dayId), JSON.stringify(checks));
    } catch (_) {
      showToast("Прогресс сохранён только до закрытия страницы");
    }
  }

  function dayCard(day) {
    const status = day.available ? "Открыть день" : "Следующий этап";
    return `
      <a class="day-card ${day.featured ? "day-card--active" : ""}" href="#day/${day.id}" aria-label="${day.name}: ${day.title}. ${status}">
        <span class="day-card__top"><strong>${day.short}</strong><span class="status-dot" aria-hidden="true"></span></span>
        ${icon(day.icon)}
        <span class="day-card__title">${day.title}</span>
        <small>${status}</small>
      </a>`;
  }

  function renderHome() {
    const monday = window.DAY_CONTENT.monday;
    app.innerHTML = `
      <section class="hero page-enter">
        <div class="hero__copy">
          <span class="eyebrow"><span></span> Практическая система недели</span>
          <h1>7 дней<br><em>эффективной</em><br>работы</h1>
          <p>Короткий ежедневный ритм для руководителя и команды: увидеть главное, выбрать действие и довести его до результата.</p>
          <a class="button button--primary" href="#day/monday">Начать с понедельника <span aria-hidden="true">→</span></a>
        </div>
        <div class="hero__visual" aria-hidden="true">
          <div class="orb"><span>7</span><small>дней</small></div>
          <div class="orbit orbit--one"></div><div class="orbit orbit--two"></div>
          <div class="float-card float-card--one">Ясный фокус</div>
          <div class="float-card float-card--two">Следующий шаг</div>
        </div>
      </section>

      <section class="section" aria-labelledby="week-title">
        <div class="section-heading">
          <div><span class="eyebrow">Навигация</span><h2 id="week-title">Неделя в одном ритме</h2></div>
          <p>Каждый день — один главный управленческий вопрос и измеримый финиш.</p>
        </div>
        <div class="days-grid">${window.WEEK_DAYS.map(dayCard).join("")}</div>
      </section>

      <section class="section current-day" aria-labelledby="today-title">
        <div class="current-day__header">
          <div>${icon("target")}<div><span class="eyebrow">Старт недели</span><h2 id="today-title">Понедельник</h2><p>${monday.subtitle}</p></div></div>
          <span class="pill">День 1</span>
        </div>
        <div class="preview-grid">
          <article class="preview-card"><span>01</span><h3>Что это за день</h3><p>Наводим ясность в CRM и находим покупателей, которые готовы двигаться сейчас.</p></article>
          <article class="preview-card"><span>02</span><h3>Что сделать</h3><ul><li>Выбрать приоритетных покупателей</li><li>Уточнить условия и барьеры</li><li>Назначить следующий шаг</li></ul></article>
          <article class="preview-card"><span>03</span><h3>Текст для чата</h3><p>Готовое сообщение поможет синхронизировать команду без длинного совещания.</p></article>
          <article class="preview-card preview-card--action"><span>04</span><h3>Рабочий интерфейс</h3><p>Чек-лист, прогресс, шаблон сообщения и материалы второго уровня.</p><a class="button button--primary" href="#day/monday">Открыть день <b aria-hidden="true">→</b></a></article>
        </div>
      </section>

      <section class="section knowledge" aria-labelledby="knowledge-title">
        <div class="knowledge__intro">${icon("book")}<div><span class="eyebrow">Preview</span><h2 id="knowledge-title">База знаний</h2><p>Материалы вне структуры недели появятся на следующем этапе.</p></div></div>
        <div class="knowledge__items">
          <div><b>Шаблоны</b><span>Документы и скрипты</span></div>
          <div><b>Инструкции</b><span>Пошаговые гайды</span></div>
          <div><b>Практики</b><span>Рабочие инструменты</span></div>
          <div><b>Материалы</b><span>Дополнительное чтение</span></div>
        </div>
        <span class="preview-label">Будет добавлено</span>
      </section>`;
  }

  function detailMarkup(item) {
    const items = item.items ? `<ul>${item.items.map((text) => `<li>${text}</li>`).join("")}</ul>` : "";
    const groups = item.groups
      ? `<div class="detail-groups">${item.groups.map(([title, text]) => `<div><strong>${title}</strong><p>${text}</p></div>`).join("")}</div>`
      : "";
    return `<details class="accordion"><summary><span>${item.title}</span><i aria-hidden="true"></i></summary><div class="accordion__body">${item.lead ? `<p>${item.lead}</p>` : ""}${items}${groups}</div></details>`;
  }

  function renderDay(dayId) {
    activeDayId = dayId;
    const data = window.DAY_CONTENT[dayId];
    const dayIndex = window.WEEK_DAYS.findIndex((day) => day.id === dayId);
    const day = window.WEEK_DAYS[dayIndex];
    const previous = window.WEEK_DAYS[dayIndex - 1];
    const next = window.WEEK_DAYS[dayIndex + 1];
    const checked = readChecks(dayId).filter((index) => index >= 0 && index < data.checklist.length);
    const finishHref = next ? `#day/${next.id}` : "#home";
    const finishLabel = next ? `Перейти: ${next.name.toLowerCase()}` : "Вернуться к неделе";
    const previousHref = previous ? `#day/${previous.id}` : "#home";
    const previousLabel = previous ? "← Предыдущий день" : "← К неделе";
    const nextHref = next ? `#day/${next.id}` : "#home";
    const nextLabel = next ? "Следующий день" : "Завершить неделю";
    app.innerHTML = `
      <section class="day-hero page-enter">
        <a class="back-link" href="#home">← К неделе</a>
        <span class="eyebrow">${data.eyebrow}</span>
        <div class="day-hero__title"><div><h1>${data.title}</h1><p>${data.subtitle}</p></div><span class="today-badge">День ${dayIndex + 1}</span></div>
      </section>

      <section class="day-section checklist-section" aria-labelledby="checklist-title">
        <div class="day-section__heading checklist-heading">${icon("check")}<div><span class="eyebrow">Миссия дня</span><h2 id="checklist-title">Что нужно сделать сегодня</h2></div><div class="progress-count"><strong id="progress-text">0/${data.checklist.length}</strong><span id="progress-label">осталось ${data.checklist.length}</span></div></div>
        <div id="progress-track" class="progress-track" role="progressbar" aria-label="Прогресс миссии: ${day.name}" aria-valuemin="0" aria-valuemax="${data.checklist.length}" aria-valuenow="0"><span id="progress-bar"></span></div>
        <div class="checklist">${data.checklist.map((text, index) => `
          <label class="check-item ${checked.includes(index) ? "is-done" : ""}">
            <input type="checkbox" data-check-index="${index}" ${checked.includes(index) ? "checked" : ""} />
            <span class="custom-check" aria-hidden="true"></span><span>${text}</span>
          </label>`).join("")}</div>
        <div class="result-note"><span aria-hidden="true">✓</span><p>${data.result}</p></div>
        <div id="completion-panel" class="completion-panel" hidden>
          ${icon(day.icon)}
          <div><span class="eyebrow">Миссия выполнена</span><h3>${data.title}: всё выполнено</h3><p>Все ${data.checklist.length} действий отмечены. Прогресс сохранён на этом устройстве.</p></div>
          <a class="button button--primary" href="${finishHref}">${finishLabel} <span aria-hidden="true">→</span></a>
        </div>
        <button id="reset-progress" class="text-button" type="button">↻ Сбросить на новый день</button>
      </section>

      <section class="day-section message-section" aria-labelledby="message-title">
        <div class="day-section__heading">${icon("copy")}<div><span class="eyebrow">Готово к отправке</span><h2 id="message-title">Текст для чата офиса</h2><p>Скопируйте и отправьте команде в рабочий чат.</p></div></div>
        <div id="office-message" class="message-box">${data.message.replaceAll("\n", "<br>")}</div>
        <button id="copy-message" class="button button--primary button--wide" type="button">${icon("copy")} <span class="button-label">Скопировать текст</span></button>
      </section>

      <section class="day-section tips-section" aria-labelledby="tips-title">
        <div class="day-section__heading">${icon("spark")}<div><span class="eyebrow">На практике</span><h2 id="tips-title">Быстрые подсказки</h2></div></div>
        <div class="tips-grid">${data.tips.map((tip) => `<article>${icon(tip.icon)}<div><h3>${tip.title}</h3><p>${tip.text}</p></div></article>`).join("")}</div>
      </section>

      <section class="day-section overview" aria-labelledby="overview-title">
        <div class="day-section__heading">${icon("target")}<div><span class="eyebrow">Контекст</span><h2 id="overview-title">Что это за день</h2><p>${data.intro}</p></div></div>
        <div class="principles">${data.principles.map((p) => `<article>${icon(p.icon)}<h3>${p.title}</h3><p>${p.text}</p></article>`).join("")}</div>
      </section>

      <section class="day-section details-section" aria-labelledby="details-title">
        <div class="day-section__heading">${icon("book")}<div><span class="eyebrow">Второй уровень</span><h2 id="details-title">Подробнее</h2><p>Практические рекомендации и формулировки из книги.</p></div></div>
        <div class="accordions">${data.details.map(detailMarkup).join("")}</div>
      </section>

      <nav class="day-navigation" aria-label="Навигация по дням">
        <a class="button button--secondary" href="${previousHref}">${previousLabel}</a>
        <a class="button button--primary" href="${nextHref}">${nextLabel} <span aria-hidden="true">→</span></a>
      </nav>`;

    updateProgress();
    document.querySelectorAll("[data-check-index]").forEach((input) => input.addEventListener("change", handleCheck));
    document.querySelector("#reset-progress").addEventListener("click", resetProgress);
    document.querySelector("#copy-message").addEventListener("click", copyMessage);
  }

  function updateProgress() {
    const inputs = [...document.querySelectorAll("[data-check-index]")];
    if (!inputs.length) return;
    const done = inputs.filter((input) => input.checked).length;
    const total = inputs.length;
    const remaining = total - done;
    document.querySelector("#progress-text").textContent = `${done}/${inputs.length}`;
    document.querySelector("#progress-label").textContent = remaining === 0 ? "день завершён" : `осталось ${remaining}`;
    document.querySelector("#progress-bar").style.width = `${(done / inputs.length) * 100}%`;
    document.querySelector("#progress-track").setAttribute("aria-valuenow", String(done));
    inputs.forEach((input) => input.closest(".check-item").classList.toggle("is-done", input.checked));
    document.querySelector(".checklist-section").classList.toggle("is-complete", remaining === 0);
    document.querySelector("#completion-panel").hidden = remaining !== 0;
  }

  function handleCheck() {
    const checked = [...document.querySelectorAll("[data-check-index]:checked")].map((input) => Number(input.dataset.checkIndex));
    writeChecks(activeDayId, checked);
    updateProgress();
    if (checked.length === window.DAY_CONTENT[activeDayId].checklist.length) showToast("Миссия дня выполнена");
  }

  function resetProgress() {
    const button = document.querySelector("#reset-progress");
    const hasProgress = document.querySelectorAll("[data-check-index]:checked").length > 0;
    if (!hasProgress) {
      showToast("Прогресс уже пуст");
      return;
    }
    if (button.dataset.armed !== "true") {
      button.dataset.armed = "true";
      button.classList.add("is-armed");
      button.textContent = "Ещё раз — сбросить прогресс";
      showToast("Подтвердите сброс повторным нажатием");
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        if (!button.isConnected) return;
        button.dataset.armed = "false";
        button.classList.remove("is-armed");
        button.textContent = "↻ Сбросить на новый день";
      }, 3200);
      return;
    }
    window.clearTimeout(resetTimer);
    document.querySelectorAll("[data-check-index]").forEach((input) => { input.checked = false; });
    writeChecks(activeDayId, []);
    updateProgress();
    button.dataset.armed = "false";
    button.classList.remove("is-armed");
    button.textContent = "↻ Сбросить на новый день";
    showToast("Прогресс сброшен");
  }

  async function copyMessage() {
    const text = window.DAY_CONTENT[activeDayId].message;
    const button = document.querySelector("#copy-message");
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.cssText = "position:fixed;opacity:0;pointer-events:none";
        document.body.append(area);
        area.select();
        const copied = document.execCommand("copy");
        area.remove();
        if (!copied) throw new Error("copy failed");
      }
      button.classList.add("is-success");
      button.querySelector(".button-label").textContent = "Скопировано";
      showToast("Текст скопирован");
      window.setTimeout(() => {
        if (!button.isConnected) return;
        button.classList.remove("is-success");
        button.querySelector(".button-label").textContent = "Скопировать текст";
      }, 2200);
    } catch (_) {
      showToast("Не удалось скопировать — выделите текст вручную");
    }
  }

  function route() {
    const hash = location.hash || "#home";
    if (hash === "#home" || hash === "#") renderHome();
    else if (hash.startsWith("#day/")) {
      const id = hash.replace("#day/", "").split("?")[0];
      window.DAY_CONTENT[id] ? renderDay(id) : renderHome();
    } else renderHome();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  window.addEventListener("hashchange", route);
  route();
})();
