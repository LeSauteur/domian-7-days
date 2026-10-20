(function () {
  "use strict";

  const STORAGE_KEY = "domian:leader-tools:v1";
  const content = window.LEADER_TOOLS_CONTENT;
  let state;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    state = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch (_) { state = {}; }
  for (const key of ["models", "weeks"]) {
    if (!state[key] || typeof state[key] !== "object" || Array.isArray(state[key])) state[key] = {};
  }

  function escapeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function save(status) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (status) status.textContent = "Сохранено в этом браузере";
    } catch (_) {
      if (status) status.textContent = "Не удалось сохранить. Скопируйте ответ перед закрытием страницы.";
    }
  }

  function reflectionMarkup(weekStart) {
    const saved = state.weeks[weekStart] || {};
    return `
      <details class="week-reflection" data-week="${weekStart}">
        <summary><span><span class="eyebrow">Фокус недели · 80/20</span><strong>Что сработало — и что убрать?</strong></span><span class="reflection-chevron" aria-hidden="true">⌄</span></summary>
        <div class="reflection-body">
          <p>Найдите действия, которые принесли результат. Принцип 80/20 — повод расставить приоритеты, а не требование получить точное соотношение.</p>
          <p class="tool-source">Неделя с ${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${weekStart}T12:00:00Z`))}. Личные заметки не влияют на выполнение миссий.</p>
          <label for="reflection-worked">Какие действия на этой неделе реально дали результат?</label>
          <textarea id="reflection-worked" data-reflection="worked" rows="3" maxlength="2000" placeholder="Действие и результат, который вы увидели">${escapeText(typeof saved.worked === "string" ? saved.worked : "")}</textarea>
          <label for="reflection-stop">Что можно сократить или перестать делать на следующей?</label>
          <textarea id="reflection-stop" data-reflection="stop" rows="3" maxlength="2000" placeholder="Что уберёте, чтобы освободить время для важного">${escapeText(typeof saved.stop === "string" ? saved.stop : "")}</textarea>
          <p class="save-status" role="status" aria-live="polite">Ответы сохраняются автоматически в этом браузере.</p>
          <p class="tool-source">По принципу 80/20 у Гари Келлера, с. 93–94. Вопросы адаптированы для недельного итога.</p>
        </div>
      </details>`;
  }

  function bindReflection(root) {
    root.querySelectorAll("[data-reflection]").forEach((field) => field.addEventListener("input", () => {
      const block = field.closest("[data-week]");
      const week = block.dataset.week;
      if (!state.weeks[week] || typeof state.weeks[week] !== "object") state.weeks[week] = {};
      state.weeks[week][field.dataset.reflection] = field.value;
      save(block.querySelector(".save-status"));
    }));
  }

  function diagnosticMarkup(item) {
    return `<span class="eyebrow">Гипотеза для проверки</span><h3 tabindex="-1">${item.heading}</h3>
      <ul>${item.questions.map((question) => `<li>${question}</li>`).join("")}</ul>
      <div class="tool-action"><strong>Первый шаг</strong><p>${item.action}</p></div>
      <a class="tool-inline-link" href="#tools/model-${item.model}">${item.modelLabel} <span aria-hidden="true">→</span></a>
      <p class="tool-source">${item.source}</p>`;
  }

  function render({ app, icon, backHref, weekStart, focusId }) {
    const selected = content.diagnostics.find((item) => item.id === state.diagnostic);
    app.innerHTML = `
      <section class="tools-hero page-enter">
        <a class="back-link" href="${backHref}">← К миссии дня</a>
        <span class="eyebrow">База знаний · Домиан</span>
        <h1>Инструменты<br>руководителя</h1>
        <p>Остановиться, найти узкое место и выбрать следующий шаг для офиса.</p>
        <nav class="tools-anchors" aria-label="Инструменты"><a href="#tools/diagnostic">Диагностика ↓</a><a href="#tools/models">4 модели ↓</a><a href="#tools/reflection">Итог недели ↓</a></nav>
      </section>
      <section id="diagnostic" class="day-section diagnostic-section" aria-labelledby="diagnostic-title">
        <div class="day-section__heading">${icon("focus")}<div><span class="eyebrow">Три опоры роста</span><h2 id="diagnostic-title">Что сейчас ограничивает рост?</h2><p>Выберите ситуацию, которую хотите разобрать. Это начало проверки, а не готовый диагноз.</p></div></div>
        <div class="diagnostic-options" role="group" aria-label="Выберите направление проверки">${content.diagnostics.map((item) => `<button type="button" class="diagnostic-choice" data-diagnostic="${item.id}" aria-pressed="${selected?.id === item.id}" aria-controls="diagnostic-result">${icon(item.icon)}<span><strong>${item.title}</strong><small>${item.subtitle}</small></span><span aria-hidden="true">→</span></button>`).join("")}</div>
        <div id="diagnostic-result" class="diagnostic-result" ${selected ? "" : "hidden"}>${selected ? diagnosticMarkup(selected) : ""}</div>
        <p class="tool-source">Основа: каналы привлечения, листинги и ресурсы — с. 33–35 книги.</p>
        <p class="save-status" id="diagnostic-save" role="status" aria-live="polite"></p>
      </section>
      <section id="models" class="day-section models-section" aria-labelledby="models-title">
        <div class="day-section__heading">${icon("book")}<div><span class="eyebrow">Посмотреть на бизнес целиком</span><h2 id="models-title">Четыре модели бизнеса</h2><p>Выберите одну область. Разберите факты и запишите одно решение.</p></div></div>
        <div class="model-grid">${content.models.map((model) => `<details class="model-card model-card--${model.id}" id="model-${model.id}" ${focusId === `model-${model.id}` ? "open" : ""}>
          <summary><span class="model-number">${model.number}</span>${icon(model.icon)}<span class="model-heading"><strong>${model.title}</strong><span>${model.name}</span></span><span class="model-chevron" aria-hidden="true">⌄</span></summary>
          <p class="model-summary">${model.summary}</p>
          <div class="model-body"><p>${model.explanation}</p><h3>Что проверить</h3><ul>${model.questions.map((question) => `<li>${question}</li>`).join("")}</ul><div class="tool-action"><strong>Одно действие</strong><p>${model.action}</p></div>
          <label for="model-note-${model.id}">${model.prompt}</label><textarea id="model-note-${model.id}" rows="3" maxlength="2000" data-model-note="${model.id}" placeholder="Запишите решение для вашего офиса">${escapeText(typeof state.models[model.id] === "string" ? state.models[model.id] : "")}</textarea>
          <p class="save-status" role="status" aria-live="polite">Ответ сохраняется автоматически в этом браузере.</p><p class="tool-source">${model.source}</p></div>
        </details>`).join("")}</div>
      </section>
      <section id="reflection" class="tools-reflection" aria-label="Недельная рефлексия">
        <label class="reflection-week-label" for="reflection-week">Заметки за неделю с</label>
        <select id="reflection-week">${[...new Set([weekStart, ...Object.keys(state.weeks).filter((week) => /^\d{4}-\d{2}-\d{2}$/.test(week))])].sort().reverse().map((week) => `<option value="${week}" ${week === weekStart ? "selected" : ""}>${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${week}T12:00:00Z`))}</option>`).join("")}</select>
        <div id="reflection-content">${reflectionMarkup(weekStart)}</div>
      </section>
      <aside class="tools-attribution"><p>${content.source}</p><p>Ссылки на страницы относятся к печатной нумерации книги. Это дополнительные инструменты: ответы не меняют прогресс семи дней.</p></aside>
      <a class="button button--secondary" href="${backHref}">← Вернуться к миссии дня</a>`;

    app.querySelectorAll("[data-diagnostic]").forEach((button) => button.addEventListener("click", () => {
      const item = content.diagnostics.find((entry) => entry.id === button.dataset.diagnostic);
      state.diagnostic = item.id;
      app.querySelectorAll("[data-diagnostic]").forEach((choice) => choice.setAttribute("aria-pressed", String(choice === button)));
      const result = app.querySelector("#diagnostic-result");
      result.innerHTML = diagnosticMarkup(item);
      result.hidden = false;
      save(app.querySelector("#diagnostic-save"));
      result.querySelector("h3").focus({ preventScroll: true });
      result.scrollIntoView({ block: "nearest", behavior: "auto" });
    }));
    app.querySelectorAll("[data-model-note]").forEach((field) => field.addEventListener("input", () => {
      state.models[field.dataset.modelNote] = field.value;
      save(field.closest(".model-body").querySelector(".save-status"));
    }));
    bindReflection(app);
    app.querySelector("#reflection-week").addEventListener("change", (event) => {
      const host = app.querySelector("#reflection-content");
      host.innerHTML = reflectionMarkup(event.target.value);
      host.querySelector("details").open = true;
      bindReflection(host);
    });
    const target = ["diagnostic", "models", "reflection", ...content.models.map((model) => `model-${model.id}`)].includes(focusId) ? app.querySelector(`#${focusId}`) : null;
    if (target) {
      if (focusId === "reflection") target.querySelector("details").open = true;
      target.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }

  window.DOMIAN_LEADER_TOOLS = { reflectionMarkup, bindReflection, render };

  // Repeated links to the current section must still open and scroll to it.
  document.querySelector("#main").addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#tools/"]');
    if (!link || link.getAttribute("href") !== location.hash) return;
    const id = location.hash.split("/")[1];
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    if (target.tagName === "DETAILS") target.open = true;
    if (id === "reflection") target.querySelector("details").open = true;
    target.scrollIntoView({ block: "start", behavior: "instant" });
  });
})();
