(function () {
  const coachForm = document.querySelector("#coachForm");
  const sessionForm = document.querySelector("#sessionForm");
  const dailyEnergyForm = document.querySelector("#dailyEnergyForm");
  const plannerForm = document.querySelector("#plannerForm");
  const lockedPlanForm = document.querySelector("#lockedPlanForm");
  const editDateInput = document.querySelector("#editDate");
  const sessionTypeSelect = document.querySelector("#sessionTypeSelect");
  const deleteSessionButton = document.querySelector("#deleteSessionButton");
  const lockedTypeSelect = document.querySelector("#lockedTypeSelect");
  const deletePlanItemButton = document.querySelector("#deletePlanItem");

  const phaseLabels = {
    base_build: "Oppbygging",
    competition_preparation: "Konkurranseforberedelse",
    competition_week: "Konkurranseuke",
    post_competition: "Etter konkurranse",
  };

  const modeLabels = {
    world_cup: "World Cup 1 x 3",
    standard_itf: "Standard ITF 2 x 2",
  };

  const sparringMetricTypes = new Set([
    "tkd_sparring_drills",
    "tkd_sparring_rounds",
    "tkd_comp_sparring",
    "hard_sparring",
  ]);

  const $ = (selector) => document.querySelector(selector);
  let activeTab = localStorage.getItem("tkdActiveTab.v1") || "today";
  let statsRange = 7;
  let selectedCalendarDate = TrainingLog.todayIso();

  function init() {
    fillSessionTypeOptions();
    fillLockedTypeOptions();
    setupMobileShell();
    loadAiConfig();
    loadPlannerForms();
    editDateInput.value = TrainingLog.todayIso();
    resetSessionForm();
    resetLockedPlanForm();
    fillDailyEnergyForm(TrainingLog.getDailyEnergyForDate(editDateInput.value));
    setFormFromExample(CoachEngine.examples.greenWorldCup);
    loadDailyStatusForDate(TrainingLog.todayIso(), true);
    fillDailyReportForm(TrainingLog.getDailyReportForDate(TrainingLog.todayIso()));
    bindEvents();
    switchTab(activeTab);
    render();
  }

  function bindEvents() {
    document.querySelectorAll("[data-tab-target]").forEach((button) => {
      button.addEventListener("click", () => switchTab(button.dataset.tabTarget));
    });

    document.querySelectorAll("[data-go-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        switchTab(button.dataset.goTab);
        focusTarget(button.dataset.focusTarget);
      });
    });

    document.querySelectorAll("[data-stats-range]").forEach((button) => {
      button.addEventListener("click", () => {
        statsRange = Number(button.dataset.statsRange || 7);
        render();
      });
    });

    document.querySelectorAll("[data-copy-chatgpt]").forEach((button) => {
      button.addEventListener("click", () => copyChatGptExport(Number(button.dataset.copyChatgpt)));
    });

    document.querySelectorAll("[data-copy-day-report]").forEach((button) => {
      button.addEventListener("click", () => copyDailyReport(button.dataset.copyDayReport));
    });

    coachForm.addEventListener("input", render);
    coachForm.addEventListener("change", render);

    sessionForm.addEventListener("submit", (event) => {
      event.preventDefault();
      TrainingLog.saveSession(readSessionForm());
      resetSessionForm();
      render();
    });

    sessionTypeSelect.addEventListener("change", () => {
      updateSparringFieldsVisibility(true);
    });

    dailyEnergyForm.addEventListener("submit", (event) => {
      event.preventDefault();
      TrainingLog.saveDailyEnergy(readDailyEnergyForm());
      render();
    });

    $("#saveDailyStatus").addEventListener("click", () => {
      const saved = TrainingLog.saveDailyStatus(readDailyStatusForm());
      fillDailyStatusForm(saved, false);
      $("#dailyStatusSaveStatus").textContent = `Lagret ${saved.date}`;
      render();
    });

    coachForm.elements.statusDate.addEventListener("change", () => {
      loadDailyStatusForDate(coachForm.elements.statusDate.value || TrainingLog.todayIso(), false);
      render();
    });

    plannerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveCompetition();
      render();
    });

    lockedPlanForm.addEventListener("submit", (event) => {
      event.preventDefault();
      WeeklyPlanner.savePlanItem(readLockedPlanForm());
      resetLockedPlanForm();
      render();
    });

    $("#newSessionButton").addEventListener("click", () => {
      resetSessionForm();
    });

    deleteSessionButton.addEventListener("click", () => {
      const id = sessionForm.elements.id.value;
      if (!id) return;
      TrainingLog.deleteSession(id);
      resetSessionForm();
      render();
    });

    editDateInput.addEventListener("change", () => {
      sessionForm.elements.date.value = editDateInput.value;
      fillDailyEnergyForm(TrainingLog.getDailyEnergyForDate(editDateInput.value));
      render();
    });

    $("#loadEnergyForEditDate").addEventListener("click", () => {
      const date = editDateInput.value || TrainingLog.todayIso();
      dailyEnergyForm.elements.date.value = date;
      fillDailyEnergyForm(TrainingLog.getDailyEnergyForDate(date));
    });

    $("#saveCompetition").addEventListener("click", () => {
      saveCompetition();
      render();
    });

    $("#generateWeekPlan").addEventListener("click", () => {
      saveCompetition();
      render();
    });

    $("#newPlanItem").addEventListener("click", resetLockedPlanForm);

    deletePlanItemButton.addEventListener("click", () => {
      const id = lockedPlanForm.elements.id.value;
      if (!id) return;
      WeeklyPlanner.deletePlanItem(id);
      resetLockedPlanForm();
      render();
    });

    document.querySelectorAll("[data-preset]").forEach((button) => {
      button.addEventListener("click", () => {
        setFormFromExample(CoachEngine.examples[button.dataset.preset]);
      });
    });

    $("#saveAiConfig").addEventListener("click", saveAiConfig);
    $("#copyAiPrompt").addEventListener("click", copyAiPrompt);
    $("#runRemoteAi").addEventListener("click", runRemoteAi);
    $("#exportBackup").addEventListener("click", exportBackupToText);
    $("#copyBackup").addEventListener("click", copyBackupText);
    $("#downloadBackup").addEventListener("click", downloadBackup);
    $("#importBackupText").addEventListener("click", importBackupFromText);
    $("#backupFileInput").addEventListener("change", importBackupFromFile);

    $("#dailyReportForm").addEventListener("submit", (event) => {
      event.preventDefault();
      saveDailyReportFromForm();
    });
    $("#dailyReportDate").addEventListener("change", () => {
      const date = $("#dailyReportDate").value || TrainingLog.todayIso();
      fillDailyReportForm(TrainingLog.getDailyReportForDate(date));
      render();
    });
  }

  function setupMobileShell() {
    if ($("#bottomNav")) return;

    addMobileLogFields();
    addPlanMobileFields();
    promoteDailyStatusSave();
    compactifyStatusForm();

    const main = document.querySelector(".app-shell");
    const verdictBand = document.querySelector(".verdict-band");
    const contentGrid = document.querySelector(".content-grid");
    const controlStack = document.querySelector(".control-stack");
    const decisionPanel = document.querySelector(".decision-panel");

    const shell = document.createElement("section");
    shell.className = "tab-shell";
    shell.innerHTML = `
      <section id="tab-today" class="tab-panel" data-tab-panel="today"></section>
      <section id="tab-calendar" class="tab-panel" data-tab-panel="calendar"></section>
      <section id="tab-log" class="tab-panel" data-tab-panel="log"></section>
      <section id="tab-stats" class="tab-panel" data-tab-panel="stats"></section>
      <section id="tab-export" class="tab-panel" data-tab-panel="export"></section>
    `;

    const today = shell.querySelector("#tab-today");
    const calendar = shell.querySelector("#tab-calendar");
    const log = shell.querySelector("#tab-log");
    const stats = shell.querySelector("#tab-stats");
    const exportTab = shell.querySelector("#tab-export");
    const renderSink = document.createElement("section");
    renderSink.id = "renderSink";
    renderSink.className = "render-sink";
    renderSink.setAttribute("aria-hidden", "true");

    today.appendChild(verdictBand);
    today.insertAdjacentHTML(
      "beforeend",
      `<section class="today-date-strip card-block">
        <span>Dagens dato</span>
        <strong id="todayDateLabel"></strong>
      </section>
      <section class="today-actions card-block">
        <button type="button" data-go-tab="today" data-focus-target="#coachForm">Add Garmin-status</button>
        <button type="button" data-go-tab="log" data-focus-target="#sessionForm">Logg økt</button>
        <button type="button" data-go-tab="export" data-focus-target="#dailyReportForm">Lag dagsrapport</button>
        <button type="button" data-copy-day-report="today">Kopier dagens rapport</button>
      </section>
      <section class="today-lists card-block">
        <article>
          <h2>Dagens planlagte</h2>
          <div id="todayPlannedList" class="mobile-list"></div>
        </article>
        <article>
          <h2>Dagens gjennomforte</h2>
          <div id="todayDoneList" class="mobile-list"></div>
        </article>
      </section>`
    );
    today.appendChild($(".daily-status-section"));
    wrapInDetails(today, coachForm, "Add Garmin-status", "compact-details status-entry-details");
    renderSink.appendChild($("#coachLine"));
    renderSink.appendChild($(".plan-section"));
    renderSink.appendChild($(".decision-grid"));

    calendar.appendChild(createCalendarSection());
    wrapInDetails(calendar, $(".week-section"), "Rediger tidligere økter", "compact-details");
    renderSink.appendChild($(".planner-section"));

    log.appendChild(sessionForm);
    wrapInDetails(log, lockedPlanForm, "Planlegg økt", "compact-details");
    renderSink.appendChild(plannerForm);
    wrapInDetails(log, dailyEnergyForm, "Kalorier per dag", "compact-details");

    stats.appendChild(createStatsControls());
    renderSink.appendChild($(".history-section"));
    renderSink.appendChild($(".readiness-section"));
    renderSink.appendChild($(".weekly-section"));
    renderSink.appendChild($(".engine-details"));

    const aiSection = $(".ai-section");
    exportTab.appendChild(createDailyReportSection());
    exportTab.appendChild(createExportShortcuts());
    exportTab.appendChild(aiSection);
    exportTab.appendChild($(".backup-section"));
    wrapDeveloperExport(aiSection);

    main.innerHTML = "";
    main.appendChild(shell);
    main.appendChild(renderSink);
    main.hidden = false;
    document.body.insertAdjacentHTML(
      "beforeend",
      `<nav id="bottomNav" class="bottom-nav" aria-label="Hovedfaner">
        <button type="button" data-tab-target="today">Today</button>
        <button type="button" data-tab-target="calendar">Calendar</button>
        <button type="button" data-tab-target="log">Logg</button>
        <button type="button" data-tab-target="stats">Stats</button>
        <button type="button" data-tab-target="export">Export</button>
      </nav>`
    );

    contentGrid?.remove();
    controlStack?.remove();
    decisionPanel?.remove();
  }

  function compactifyStatusForm() {
    coachForm.classList.add("status-form");
    const presetRow = coachForm.querySelector(".preset-row");
    if (presetRow) presetRow.classList.add("is-hidden");

    const panelTitle = coachForm.querySelector(".panel-header h2");
    if (panelTitle) panelTitle.textContent = "Daily status";

    const firstGrid = coachForm.querySelector(".field-grid");
    const trendDetails = Array.from(coachForm.querySelectorAll("details")).find((details) =>
      details.querySelector("[name='yellowDaysInRow']")
    );
    if (firstGrid && !$("#coachSettingsDetails")) {
      const settingsDetails = document.createElement("details");
      settingsDetails.id = "coachSettingsDetails";
      settingsDetails.className = "compact-details";
      settingsDetails.innerHTML = "<summary>Avansert statusinnstillinger</summary>";
      firstGrid.parentElement.insertBefore(settingsDetails, firstGrid);
      settingsDetails.appendChild(firstGrid);
      if (trendDetails) settingsDetails.appendChild(trendDetails);
    }

    const garminDetails = document.querySelector(".garmin-details");
    const sliderGrid = coachForm.querySelector(".slider-grid");
    if (garminDetails) {
      garminDetails.querySelector("summary").textContent = "Avansert søvn";
      const statusDateField = coachForm.elements.statusDate?.closest("label");
      const notesField = coachForm.elements.statusNotes?.closest("label");
      const bedtimeField = coachForm.elements.bedtime?.closest("label");
      const wakeField = coachForm.elements.wakeTime?.closest("label");
      if (sliderGrid && statusDateField && statusDateField.parentElement !== sliderGrid) {
        sliderGrid.insertBefore(statusDateField, sliderGrid.firstElementChild);
      }
      if (sliderGrid && bedtimeField && bedtimeField.parentElement !== sliderGrid) {
        sliderGrid.appendChild(bedtimeField);
      }
      if (sliderGrid && wakeField && wakeField.parentElement !== sliderGrid) {
        sliderGrid.appendChild(wakeField);
      }
      if (sliderGrid && notesField && notesField.parentElement !== sliderGrid) {
        notesField.classList.add("wide");
        sliderGrid.appendChild(notesField);
      }
    }

    ["sleepQuality", "legFatigue"].forEach((name) => {
      const field = coachForm.elements[name]?.closest("label");
      if (field) field.classList.add("status-secondary-field");
    });
  }

  function addMobileLogFields() {
    if (!sessionForm.elements.intensity) {
      const rpeLabel = sessionForm.elements.rpe.closest("label");
      rpeLabel.insertAdjacentHTML(
        "afterend",
        `<label>
          Intensitet
          <select name="intensity">
            <option value="easy">Lett</option>
            <option value="moderate" selected>Moderat</option>
            <option value="hard">Hard</option>
          </select>
        </label>`
      );
    }

    const legField = sessionForm.elements.legFatigueAfter.closest("label");
    legField.classList.remove("sparring-field");
    legField.querySelector("input").setAttribute("max", "10");
    legField.childNodes[0].textContent = "Bein-følelse 0-10";

    if (!sessionForm.elements.aerobicTrainingEffect) {
      const notesLabel = sessionForm.elements.notes.closest("label");
      notesLabel.insertAdjacentHTML(
        "beforebegin",
        `<details class="advanced-log-section sparring-extra">
          <summary>Sparring-detaljer</summary>
          <div class="field-grid" id="sparringAdvancedFields"></div>
        </details>
        <details class="advanced-log-section">
          <summary>Intervall-detaljer</summary>
          <div class="field-grid">
            <label>Antall drag<input name="intervalReps" type="number" min="0" step="1" value="0" /></label>
            <label>Draglengde<input name="intervalWork" type="text" placeholder="F.eks. 3 min" /></label>
            <label>Pauselengde<input name="intervalRest" type="text" placeholder="F.eks. 90 sek" /></label>
            <label>Beste/maks puls<input name="intervalBestPulse" type="number" min="0" max="230" step="1" value="0" /></label>
            <label class="wide">Holdt siste drag kvalitet?
              <select name="intervalLastRepQuality">
                <option value="">Ikke vurdert</option>
                <option value="yes">Ja</option>
                <option value="no">Nei</option>
              </select>
            </label>
          </div>
        </details>
        <details class="advanced-log-section">
          <summary>Garmin ekstra</summary>
          <div class="field-grid" id="garminExtraFields">
            <label>Aerob TE<input name="aerobicTrainingEffect" type="number" min="0" max="5" step="0.1" value="0" /></label>
            <label>Anaerob TE<input name="anaerobicTrainingEffect" type="number" min="0" max="5" step="0.1" value="0" /></label>
            <label class="checkbox-line"><input type="checkbox" name="hardQuick" /> Hard hovedøkt</label>
          </div>
        </details>`
      );
    }

    const sparringTarget = $("#sparringAdvancedFields");
    const garminTarget = $("#garminExtraFields");
    ["backPainBefore", "plannedVsActual"].forEach((name) => {
      const field = sessionForm.elements[name]?.closest("label");
      if (field && garminTarget && field.parentElement !== garminTarget) {
        garminTarget.appendChild(field);
      }
    });
    const hardField = sessionForm.elements.hard?.closest("label");
    if (hardField && garminTarget && hardField.parentElement !== garminTarget) {
      garminTarget.appendChild(hardField);
    }
    document.querySelectorAll(".sparring-field").forEach((field) => {
      sparringTarget.appendChild(field);
    });
    if (!sessionForm.elements.sparringRounds) {
      sparringTarget.insertAdjacentHTML(
        "afterbegin",
        `<label>Antall runder<input name="sparringRounds" type="number" min="0" step="1" value="0" /></label>
        <label>Rundeformat
          <select name="roundFormat">
            <option value="">Ikke valgt</option>
            <option value="1x3">1 x 3 min</option>
            <option value="2x2">2 x 2 min</option>
            <option value="other">Annet</option>
          </select>
        </label>`
      );
      sparringTarget.insertAdjacentHTML(
        "beforeend",
        `<label class="wide">Hva fungerte?<textarea name="sparringWorked" rows="2"></textarea></label>
        <label class="wide">Hva må forbedres?<textarea name="sparringImprove" rows="2"></textarea></label>`
      );
    }
  }

  function addPlanMobileFields() {
    if (lockedPlanForm.elements.startTime) return;
    lockedPlanForm.elements.date.closest("label").insertAdjacentHTML(
      "afterend",
      `<label>
        Tidspunkt
        <input name="startTime" type="time" />
      </label>`
    );
    lockedPlanForm.elements.durationMin.closest("label").insertAdjacentHTML(
      "afterend",
      `<label>
        Planlagt intensitet
        <select name="plannedIntensity">
          <option value="easy">Lett</option>
          <option value="moderate" selected>Moderat</option>
          <option value="hard">Hard</option>
        </select>
      </label>
      <label class="wide">
        Fokus
        <input name="focus" type="text" placeholder="F.eks. 2 x 2 restart / teknisk kvalitet" />
      </label>`
    );
  }

  function promoteDailyStatusSave() {
    const details = document.querySelector(".garmin-details");
    const saveRow = details?.querySelector("#saveDailyStatus")?.closest(".button-row");
    if (details && saveRow) {
      saveRow.classList.add("primary-save-row");
      details.insertAdjacentElement("afterend", saveRow);
    }
  }

  function createCalendarSection() {
    const section = document.createElement("section");
    section.className = "calendar-mobile-section";
    section.innerHTML = `
      <div class="section-title">
        <h2>Calendar</h2>
        <span id="calendarWeekLabel">Denne uka</span>
      </div>
      <div id="calendarWeekCards" class="calendar-week-cards"></div>
      <article id="dayDetail" class="day-detail-card">
        <div class="section-title">
          <h2 id="dayDetailTitle">Dag</h2>
          <span id="dayDetailLoad">0 min</span>
        </div>
        <div class="day-detail-grid">
          <div><span>Søvnscore</span><strong id="dayDetailSleep">-</strong></div>
          <div><span>HRV</span><strong id="dayDetailHrv">-</strong></div>
          <div><span>Aktive kcal</span><strong id="dayDetailCalories">-</strong></div>
          <div><span>Hardhet</span><strong id="dayDetailHardness">-</strong></div>
        </div>
        <h3>Planlagt</h3>
        <div id="dayDetailPlanned" class="mobile-list"></div>
        <h3>Gjennomført</h3>
        <div id="dayDetailDone" class="mobile-list"></div>
        <p id="dayDetailNotes" class="muted-inline"></p>
        <div class="button-row">
          <button type="button" data-go-tab="log" data-focus-target="#lockedPlanForm">Planlegg økt</button>
          <button type="button" data-go-tab="log" data-focus-target="#sessionForm">Logg økt</button>
        </div>
      </article>`;
    return section;
  }

  function createStatsControls() {
    const section = document.createElement("section");
    section.className = "stats-control-section";
    section.innerHTML = `
      <div class="section-title">
        <h2>Stats</h2>
        <div class="segmented-control" aria-label="Datoperiode">
          <button type="button" data-stats-range="7">7 dager</button>
          <button type="button" data-stats-range="14">14 dager</button>
          <button type="button" data-stats-range="30">30 dager</button>
        </div>
      </div>
      <div id="statsCards" class="stats-card-grid"></div>
      <h3>Training Flags</h3>
      <ul id="statsFlags" class="compact-flags"></ul>`;
    return section;
  }

  function createDailyReportSection() {
    const section = document.createElement("section");
    section.className = "daily-report-section card-block";
    section.innerHTML = `
      <div class="section-title">
        <h2>Dagsrapport</h2>
        <span id="dailyReportStatus">Ikke lagret</span>
      </div>
      <form id="dailyReportForm" class="daily-report-form">
        <div class="field-grid">
          <label>
            Dato
            <input id="dailyReportDate" name="date" type="date" />
          </label>
          <label>
            Ble planen fulgt?
            <select name="planFollowed">
              <option value="yes">Ja</option>
              <option value="partly">Delvis</option>
              <option value="no">Nei</option>
            </select>
          </label>
          <label class="wide">Hva føltes bra i dag?<textarea name="feltGood" rows="2"></textarea></label>
          <label class="wide">Hva føltes dårlig?<textarea name="feltBad" rows="2"></textarea></label>
          <label class="wide">Hvordan føltes beina?<textarea name="legs" rows="2"></textarea></label>
          <label class="wide">Hvordan føltes ryggen?<textarea name="back" rows="2"></textarea></label>
          <label class="wide">Var kvaliteten bedre eller dårligere enn forventet?<textarea name="qualityVsExpected" rows="2"></textarea></label>
          <label class="wide">Hva er jeg usikker på?<textarea name="unsureAbout" rows="2"></textarea></label>
          <label class="wide">Hva vil jeg at coachen skal hjelpe med?<textarea name="coachQuestion" rows="2"></textarea></label>
        </div>
        <div class="button-row">
          <button type="submit">Lagre dagsrapport</button>
          <button type="button" data-copy-day-report="selected">Kopier dagsrapport til ChatGPT</button>
        </div>
      </form>
      <details class="report-preview compact-details" open>
        <summary>Automatisk hentet for datoen</summary>
        <div id="dailyReportAutoSummary" class="mobile-list"></div>
      </details>`;
    return section;
  }

  function createExportShortcuts() {
    const section = document.createElement("section");
    section.className = "export-shortcuts card-block";
    section.innerHTML = `
      <div class="section-title">
        <h2>Export til ChatGPT</h2>
        <span>Kopier rapport</span>
      </div>
      <label>
        Valgt dato
        <input id="exportDate" type="date" />
      </label>
      <div class="button-row export-buttons">
        <button type="button" data-copy-day-report="today">Kopier dagens rapport</button>
        <button type="button" data-copy-day-report="export-date">Kopier valgt dato</button>
        <button type="button" data-copy-chatgpt="7">Kopier siste 7 dager</button>
        <button type="button" data-copy-chatgpt="14">Kopier 14 dager</button>
        <button type="button" data-copy-chatgpt="30">Kopier 30 dager</button>
      </div>`;
    return section;
  }

  function wrapInDetails(parent, node, summary, className) {
    const details = document.createElement("details");
    details.className = className || "";
    details.innerHTML = `<summary>${summary}</summary>`;
    details.appendChild(node);
    parent.appendChild(details);
  }

  function wrapDeveloperExport(aiSection) {
    if (!aiSection) return;
    const title = aiSection.querySelector(".section-title h2");
    const status = aiSection.querySelector("#aiStatus");
    if (title) title.textContent = "Rapporttekst";
    if (status && status.textContent === "Manuell eksport klar") status.textContent = "Klar";
    const fieldGrid = aiSection.querySelector(".field-grid");
    const buttonRow = aiSection.querySelector(".button-row");
    if (!fieldGrid || $("#developerExportDetails")) return;
    const details = document.createElement("details");
    details.id = "developerExportDetails";
    details.className = "compact-details";
    details.innerHTML = "<summary>Avansert</summary>";
    details.appendChild(fieldGrid);
    details.appendChild(buttonRow);
    aiSection.insertBefore(details, $("#aiPrompt"));
  }

  function switchTab(tab) {
    activeTab = ["today", "calendar", "log", "stats", "export"].includes(tab) ? tab : "today";
    localStorage.setItem("tkdActiveTab.v1", activeTab);
    document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.tabPanel === activeTab);
    });
    document.querySelectorAll("[data-tab-target]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tabTarget === activeTab);
    });
  }

  function focusTarget(selector) {
    if (!selector) return;
    const node = $(selector);
    if (!node) return;
    const details = node.closest("details");
    if (details) details.open = true;
    setTimeout(() => {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
      const firstInput = node.querySelector("input, select, textarea, button");
      firstInput?.focus({ preventScroll: true });
    }, 80);
  }

  function fillSessionTypeOptions() {
    sessionTypeSelect.innerHTML = "";
    Object.entries(TrainingLog.sessionTypes).forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      sessionTypeSelect.appendChild(option);
    });
  }

  function fillLockedTypeOptions() {
    lockedTypeSelect.innerHTML = "";
    Object.entries(WeeklyPlanner.lockedTypes).forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      lockedTypeSelect.appendChild(option);
    });
  }

  function loadPlannerForms() {
    const competition = WeeklyPlanner.readCompetition();
    const weekStart = WeeklyPlanner.startOfWeek(TrainingLog.todayIso());
    plannerForm.elements.competitionDate.value = competition.date || "";
    plannerForm.elements.competitionName.value = competition.name || "";
    plannerForm.elements.competitionMode.value = competition.mode || "world_cup";
    plannerForm.elements.targetHours.value = localStorage.getItem("strictTkdTargetHours.v1") || "18";
    plannerForm.elements.weekStart.value = weekStart;
  }

  function numberValue(form, name) {
    const value = form.elements[name].value;
    return value === "" ? 0 : Number(value);
  }

  function buildCoachInput() {
    const history = TrainingLog.analyzeHistory(TrainingLog.readSessions());
    const checkIn = {
      sleepHours: numberValue(coachForm, "sleepHours"),
      sleepQuality: numberValue(coachForm, "sleepQuality"),
      sleepScore: numberValue(coachForm, "sleepScore"),
      hrvStatus: coachForm.elements.hrvStatus.value,
      hrvValue: numberValue(coachForm, "hrvValue"),
      restingHr: numberValue(coachForm, "restingHr"),
      restingHrDelta: numberValue(coachForm, "restingHrDelta"),
      bodyBatteryMorning: numberValue(coachForm, "bodyBatteryMorning"),
      bodyBatteryEvening: numberValue(coachForm, "bodyBatteryEvening"),
      stressLevel: coachForm.elements.stressLevel.value,
      energy: numberValue(coachForm, "energy"),
      motivation: numberValue(coachForm, "motivation"),
      legFatigue: numberValue(coachForm, "legFatigue"),
      soreness: numberValue(coachForm, "soreness"),
      backPain: numberValue(coachForm, "backPain"),
      yellowDaysInRow: numberValue(coachForm, "yellowDaysInRow"),
      lowHrvDays: numberValue(coachForm, "lowHrvDays"),
      highRestingHrDays: numberValue(coachForm, "highRestingHrDays"),
      heavyLegDays: numberValue(coachForm, "heavyLegDays"),
      backPainTrend: coachForm.elements.backPainTrend.value,
      sameWorkoutRpeTrend: coachForm.elements.sameWorkoutRpeTrend.value,
      badSleepDays: numberValue(coachForm, "badSleepDays"),
    };

    if (history.backPainTrend === "rising" && checkIn.backPainTrend !== "worse") {
      checkIn.backPainTrend = "worse";
    }
    if (history.rpeTrendSpecific === "rising" && checkIn.sameWorkoutRpeTrend !== "higher") {
      checkIn.sameWorkoutRpeTrend = "higher";
    }

    return {
      competitionMode: coachForm.elements.competitionMode.value,
      trainingPhase: coachForm.elements.trainingPhase.value,
      plannedTkd: coachForm.elements.plannedTkd.value,
      importantSparringTomorrow: coachForm.elements.importantSparringTomorrow.checked,
      checkIn,
      recentSessions: history.last7,
    };
  }

  function setFormFromExample(example) {
    coachForm.elements.competitionMode.value = example.competitionMode;
    coachForm.elements.trainingPhase.value = example.trainingPhase;
    coachForm.elements.plannedTkd.value = example.plannedTkd;
    coachForm.elements.importantSparringTomorrow.checked = Boolean(example.importantSparringTomorrow);

    Object.entries(example.checkIn).forEach(([key, value]) => {
      if (coachForm.elements[key]) {
        coachForm.elements[key].value = value;
      }
    });

    render();
  }

  function readSessionForm() {
    const sparringMetricsAllowed = isSparringMetricType(sessionForm.elements.type.value);
    return {
      id: sessionForm.elements.id.value || undefined,
      date: sessionForm.elements.date.value || TrainingLog.todayIso(),
      type: sessionForm.elements.type.value,
      name: sessionForm.elements.name.value,
      durationMin: numberValue(sessionForm, "durationMin"),
      rpe: numberValue(sessionForm, "rpe"),
      avgPulse: numberValue(sessionForm, "avgPulse"),
      maxPulse: numberValue(sessionForm, "maxPulse"),
      intensity: sessionForm.elements.intensity?.value || "moderate",
      hard:
        sessionForm.elements.hard.checked ||
        Boolean(sessionForm.elements.hardQuick?.checked) ||
        sessionForm.elements.intensity?.value === "hard",
      activeCalories: numberValue(sessionForm, "activeCalories"),
      backPainBefore: numberValue(sessionForm, "backPainBefore"),
      backPainAfter: numberValue(sessionForm, "backPainAfter"),
      legFatigueAfter: numberValue(sessionForm, "legFatigueAfter"),
      sparringQuality: sparringMetricsAllowed ? numberValue(sessionForm, "sparringQuality") : 0,
      footworkQuality: sparringMetricsAllowed ? numberValue(sessionForm, "footworkQuality") : 0,
      kickQualityUnderFatigue: sparringMetricsAllowed
        ? numberValue(sessionForm, "kickQualityUnderFatigue")
        : 0,
      offensiveCommit: sparringMetricsAllowed ? numberValue(sessionForm, "offensiveCommit") : 0,
      sparringRounds: sparringMetricsAllowed ? numberValue(sessionForm, "sparringRounds") : 0,
      roundFormat: sparringMetricsAllowed ? sessionForm.elements.roundFormat.value : "",
      sparringWorked: sparringMetricsAllowed ? sessionForm.elements.sparringWorked.value : "",
      sparringImprove: sparringMetricsAllowed ? sessionForm.elements.sparringImprove.value : "",
      intervalReps: numberValue(sessionForm, "intervalReps"),
      intervalWork: sessionForm.elements.intervalWork?.value || "",
      intervalRest: sessionForm.elements.intervalRest?.value || "",
      intervalBestPulse: numberValue(sessionForm, "intervalBestPulse"),
      intervalLastRepQuality: sessionForm.elements.intervalLastRepQuality?.value || "",
      aerobicTrainingEffect: numberValue(sessionForm, "aerobicTrainingEffect"),
      anaerobicTrainingEffect: numberValue(sessionForm, "anaerobicTrainingEffect"),
      plannedVsActual: sessionForm.elements.plannedVsActual.value,
      notes: sessionForm.elements.notes.value,
    };
  }

  function fillSessionForm(session) {
    sessionForm.elements.id.value = session.id;
    sessionForm.elements.date.value = session.date;
    sessionForm.elements.type.value = session.type;
    sessionForm.elements.name.value = session.name;
    sessionForm.elements.durationMin.value = session.durationMin;
    sessionForm.elements.rpe.value = session.rpe || 1;
    sessionForm.elements.avgPulse.value = session.avgPulse || 0;
    sessionForm.elements.maxPulse.value = session.maxPulse || 0;
    sessionForm.elements.intensity.value = session.intensity || (session.hard ? "hard" : "moderate");
    sessionForm.elements.hard.checked = Boolean(session.hard);
    sessionForm.elements.activeCalories.value = session.activeCalories || session.caloriesBurned || 0;
    sessionForm.elements.backPainBefore.value = session.backPainBefore || 0;
    if (sessionForm.elements.backPainBeforeQuick) {
      sessionForm.elements.backPainBeforeQuick.value = session.backPainBefore || 0;
    }
    sessionForm.elements.backPainAfter.value = session.backPainAfter || 0;
    sessionForm.elements.legFatigueAfter.value = session.legFatigueAfter || 1;
    sessionForm.elements.sparringQuality.value = session.sparringQuality || 0;
    sessionForm.elements.footworkQuality.value = session.footworkQuality || 0;
    sessionForm.elements.kickQualityUnderFatigue.value = session.kickQualityUnderFatigue || 0;
    sessionForm.elements.offensiveCommit.value = session.offensiveCommit || 0;
    sessionForm.elements.sparringRounds.value = session.sparringRounds || 0;
    sessionForm.elements.roundFormat.value = session.roundFormat || "";
    sessionForm.elements.sparringWorked.value = session.sparringWorked || "";
    sessionForm.elements.sparringImprove.value = session.sparringImprove || "";
    sessionForm.elements.intervalReps.value = session.intervalReps || 0;
    sessionForm.elements.intervalWork.value = session.intervalWork || "";
    sessionForm.elements.intervalRest.value = session.intervalRest || "";
    sessionForm.elements.intervalBestPulse.value = session.intervalBestPulse || 0;
    sessionForm.elements.intervalLastRepQuality.value = session.intervalLastRepQuality || "";
    sessionForm.elements.aerobicTrainingEffect.value = session.aerobicTrainingEffect || 0;
    sessionForm.elements.anaerobicTrainingEffect.value = session.anaerobicTrainingEffect || 0;
    sessionForm.elements.plannedVsActual.value = session.plannedVsActual || "as_planned";
    sessionForm.elements.notes.value = session.notes || "";
    editDateInput.value = session.date;
    deleteSessionButton.disabled = false;
    updateSparringFieldsVisibility(false);
  }

  function readDailyEnergyForm() {
    return {
      date: dailyEnergyForm.elements.date.value || TrainingLog.todayIso(),
      restingCalories: numberValue(dailyEnergyForm, "restingCalories"),
      caloriesConsumed: numberValue(dailyEnergyForm, "caloriesConsumed"),
      notes: dailyEnergyForm.elements.notes.value,
    };
  }

  function readDailyStatusForm() {
    return {
      date: coachForm.elements.statusDate.value || TrainingLog.todayIso(),
      bedtime: coachForm.elements.bedtime.value,
      wakeTime: coachForm.elements.wakeTime.value,
      totalSleepHours: numberValue(coachForm, "sleepHours"),
      sleepQuality: numberValue(coachForm, "sleepQuality"),
      sleepScore: numberValue(coachForm, "sleepScore"),
      remSleepHours: numberValue(coachForm, "remSleepHours"),
      deepSleepHours: numberValue(coachForm, "deepSleepHours"),
      lightSleepHours: numberValue(coachForm, "lightSleepHours"),
      awakeHours: numberValue(coachForm, "awakeHours"),
      hrvValue: numberValue(coachForm, "hrvValue"),
      hrvStatus: coachForm.elements.hrvStatus.value,
      restingHr: numberValue(coachForm, "restingHr"),
      restingHrDelta: numberValue(coachForm, "restingHrDelta"),
      bodyBatteryMorning: numberValue(coachForm, "bodyBatteryMorning"),
      bodyBatteryEvening: numberValue(coachForm, "bodyBatteryEvening"),
      stressLevel: coachForm.elements.stressLevel.value,
      energy: numberValue(coachForm, "energy"),
      motivation: numberValue(coachForm, "motivation"),
      backPain: numberValue(coachForm, "backPain"),
      legSoreness: numberValue(coachForm, "soreness"),
      notes: coachForm.elements.statusNotes.value,
    };
  }

  function saveCompetition() {
    WeeklyPlanner.writeCompetition({
      date: plannerForm.elements.competitionDate.value,
      name: plannerForm.elements.competitionName.value,
      mode: plannerForm.elements.competitionMode.value,
    });
    localStorage.setItem("strictTkdTargetHours.v1", plannerForm.elements.targetHours.value || "18");
  }

  function readLockedPlanForm() {
    return {
      id: lockedPlanForm.elements.id.value || undefined,
      date: lockedPlanForm.elements.date.value || TrainingLog.todayIso(),
      type: lockedPlanForm.elements.type.value,
      title: lockedPlanForm.elements.title.value,
      startTime: lockedPlanForm.elements.startTime?.value || "",
      durationMin: numberValue(lockedPlanForm, "durationMin"),
      plannedIntensity: lockedPlanForm.elements.plannedIntensity?.value || "moderate",
      focus: lockedPlanForm.elements.focus?.value || "",
      notes: lockedPlanForm.elements.notes.value,
      locked: true,
    };
  }

  function fillLockedPlanForm(item) {
    lockedPlanForm.elements.id.value = item.id;
    lockedPlanForm.elements.date.value = item.date;
    lockedPlanForm.elements.type.value = item.type;
    lockedPlanForm.elements.title.value = item.title;
    lockedPlanForm.elements.startTime.value = item.startTime || "";
    lockedPlanForm.elements.durationMin.value = item.durationMin;
    lockedPlanForm.elements.plannedIntensity.value = item.plannedIntensity || "moderate";
    lockedPlanForm.elements.focus.value = item.focus || "";
    lockedPlanForm.elements.notes.value = item.notes || "";
    deletePlanItemButton.disabled = false;
  }

  function resetLockedPlanForm() {
    lockedPlanForm.reset();
    lockedPlanForm.elements.id.value = "";
    lockedPlanForm.elements.date.value = plannerForm.elements.weekStart.value || TrainingLog.todayIso();
    lockedPlanForm.elements.startTime.value = "";
    lockedPlanForm.elements.durationMin.value = 60;
    lockedPlanForm.elements.plannedIntensity.value = "moderate";
    lockedPlanForm.elements.focus.value = "";
    deletePlanItemButton.disabled = true;
  }

  function fillDailyEnergyForm(entry) {
    dailyEnergyForm.elements.date.value = entry.date || TrainingLog.todayIso();
    dailyEnergyForm.elements.restingCalories.value = entry.restingCalories || 0;
    dailyEnergyForm.elements.caloriesConsumed.value = entry.caloriesConsumed || 0;
    dailyEnergyForm.elements.notes.value = entry.notes || "";
  }

  function loadDailyStatusForDate(date, preserveCoachDefaults) {
    const saved = TrainingLog.readDailyStatuses().find((entry) => entry.date === date);
    fillDailyStatusForm(saved || { date }, preserveCoachDefaults);
    $("#dailyStatusSaveStatus").textContent = saved ? `Lagret ${saved.date}` : "Ikke lagret ennå";
  }

  function fillDailyStatusForm(entry, preserveCoachDefaults) {
    const status = entry || { date: TrainingLog.todayIso() };
    coachForm.elements.statusDate.value = status.date || TrainingLog.todayIso();
    setStatusValue("bedtime", status.bedtime || "");
    setStatusValue("wakeTime", status.wakeTime || "");
    setStatusValue("sleepScore", status.sleepScore || 0);
    setStatusValue("remSleepHours", status.remSleepHours || 0);
    setStatusValue("deepSleepHours", status.deepSleepHours || 0);
    setStatusValue("lightSleepHours", status.lightSleepHours || 0);
    setStatusValue("awakeHours", status.awakeHours || 0);
    setStatusValue("hrvValue", status.hrvValue || 0);
    setStatusValue("restingHr", status.restingHr || 0);
    setStatusValue("bodyBatteryMorning", status.bodyBatteryMorning || 0);
    setStatusValue("bodyBatteryEvening", status.bodyBatteryEvening || 0);
    setStatusValue("stressLevel", status.stressLevel || "unknown");
    setStatusValue("statusNotes", status.notes || "");

    if (!preserveCoachDefaults || status.totalSleepHours) {
      setStatusValue("sleepHours", status.totalSleepHours || 0);
    }
    if (!preserveCoachDefaults || status.sleepQuality) {
      setStatusValue("sleepQuality", status.sleepQuality || 3);
    }
    if (status.hrvStatus) {
      setStatusValue("hrvStatus", status.hrvStatus);
    }
    if (!preserveCoachDefaults || status.restingHrDelta) {
      setStatusValue("restingHrDelta", status.restingHrDelta || 0);
    }
    if (!preserveCoachDefaults || status.energy) {
      setStatusValue("energy", status.energy || 4);
    }
    if (!preserveCoachDefaults || status.motivation) {
      setStatusValue("motivation", status.motivation || 5);
    }
    if (!preserveCoachDefaults || status.backPain) {
      setStatusValue("backPain", status.backPain || 1);
    }
    if (!preserveCoachDefaults || status.legSoreness) {
      setStatusValue("soreness", status.legSoreness || 1);
    }
    renderSleepStageWarning(status);
  }

  function setStatusValue(name, value) {
    if (coachForm.elements[name]) {
      coachForm.elements[name].value = value;
    }
  }

  function resetSessionForm() {
    sessionForm.reset();
    sessionForm.elements.id.value = "";
    sessionForm.elements.date.value = editDateInput.value || TrainingLog.todayIso();
    sessionForm.elements.durationMin.value = 45;
    sessionForm.elements.rpe.value = 6;
    sessionForm.elements.intensity.value = "moderate";
    sessionForm.elements.activeCalories.value = 0;
    sessionForm.elements.legFatigueAfter.value = 0;
    sessionForm.elements.sparringQuality.value = 0;
    sessionForm.elements.footworkQuality.value = 0;
    sessionForm.elements.kickQualityUnderFatigue.value = 0;
    sessionForm.elements.offensiveCommit.value = 0;
    sessionForm.elements.sparringRounds.value = 0;
    sessionForm.elements.roundFormat.value = "";
    sessionForm.elements.sparringWorked.value = "";
    sessionForm.elements.sparringImprove.value = "";
    sessionForm.elements.intervalReps.value = 0;
    sessionForm.elements.intervalWork.value = "";
    sessionForm.elements.intervalRest.value = "";
    sessionForm.elements.intervalBestPulse.value = 0;
    sessionForm.elements.intervalLastRepQuality.value = "";
    sessionForm.elements.aerobicTrainingEffect.value = 0;
    sessionForm.elements.anaerobicTrainingEffect.value = 0;
    if (sessionForm.elements.hardQuick) sessionForm.elements.hardQuick.checked = false;
    sessionForm.elements.plannedVsActual.value = "as_planned";
    deleteSessionButton.disabled = true;
    updateSparringFieldsVisibility(true);
  }

  function isSparringMetricType(type) {
    return sparringMetricTypes.has(type);
  }

  function updateSparringFieldsVisibility(clearWhenHidden) {
    const show = isSparringMetricType(sessionForm.elements.type.value);
    document.querySelectorAll(".sparring-field").forEach((field) => {
      field.classList.toggle("is-hidden", !show);
    });
    if (!show && clearWhenHidden) {
      sessionForm.elements.legFatigueAfter.value = 0;
      sessionForm.elements.sparringQuality.value = 0;
      sessionForm.elements.footworkQuality.value = 0;
      sessionForm.elements.kickQualityUnderFatigue.value = 0;
      sessionForm.elements.offensiveCommit.value = 0;
    }
  }

  function render() {
    const input = buildCoachInput();
    const result = CoachEngine.selectPlan(input);
    const history = TrainingLog.analyzeHistory(TrainingLog.readSessions());
    const aiPayload = TrainingLog.createAiPayload({
      coachInput: input,
      coachPlan: result,
      weeklyPlanner: WeeklyPlanner.createWeeklyPlan({
        history,
        planItems: WeeklyPlanner.getPlanItemsForWeek(plannerForm.elements.weekStart.value),
        competition: WeeklyPlanner.readCompetition(),
        targetHours: numberValue(plannerForm, "targetHours") || 18,
        weekStart: plannerForm.elements.weekStart.value,
        manualPhase: coachForm.elements.trainingPhase.value,
        competitionMode: plannerForm.elements.competitionMode.value,
      }),
    });
    const session = result.session || {};
    const readiness = result.readiness;
    const todayStatus = TrainingLog.getDailyStatusForDate(TrainingLog.todayIso());
    const todaySessions = TrainingLog.getSessionsForDate(TrainingLog.todayIso());

    $("#coachVerdict").textContent = todaySessions.length ? `${todaySessions.length} økt${todaySessions.length === 1 ? "" : "er"} logget` : "Klar for logging";
    $("#readinessScore").textContent = `${todayStatus.totalSleepHours || "-"} t / score ${todayStatus.sleepScore || "-"}`;
    $("#weekVolume").textContent = todayStatus.hrvValue ? `${todayStatus.hrvValue} ms` : todayStatus.hrvStatus || "-";
    $("#calorieBalance").textContent = `${history.last7Hours} t / ${history.hardSessions7} hard`;

    const coachLine = $("#coachLine");
    coachLine.className = `coach-line ${readiness.category}`;
    coachLine.textContent = buildCoachLine(result, history);

    $("#todaysRisk").textContent = result.todaysRisk;
    $("#mainFocus").textContent = result.mainFocus;
    $("#doNotDo").textContent = result.doNotDo;
    $("#sparringBenefit").textContent = result.sparringBenefit;

    $("#sessionType").textContent = session.type || "-";
    $("#sessionTitle").textContent = session.title || "-";
    $("#sessionRpe").textContent = `RPE: ${session.rpe || "-"}`;
    $("#sessionPulse").textContent = `Puls: ${session.pulse || "-"}`;
    $("#sessionDuration").textContent = session.durationMin ? `${session.durationMin} min` : "Varighet styrt";
    $("#todayDateLabel").textContent = TrainingLog.todayIso();
    renderList("#sessionInstructions", session.instructions, "Ingen økt valgt.");
    renderList("#stopRules", session.stopRules, "Stopp hvis kvaliteten faller.");
    renderList("#cuts", result.cutsIfTooMuch, "Kutt volum for kvalitet.");

    renderHistory(history);
    renderDailyStatus(history);
    renderWeek(history);
    renderSelectedDate();
    renderPlanner(history);
    renderTodayLists();
    renderCalendar(history);
    renderStats(history);
    renderDailyReportPanel();

    $("#readinessCategory").textContent = readiness.categoryLabel;
    $("#readinessReason").textContent = readiness.reasoning;
    renderList("#pullsUp", readiness.pullsUp, "Ingenting trekker tydelig opp.");
    renderList("#pullsDown", readiness.pullsDown, "Ingenting trekker tydelig ned.");
    renderList("#forbidden", readiness.forbiddenToday, "Ingen ekstra begrensninger.");

    $("#weeklyHard").textContent = `${result.weeklyOverview.hardSessions} harde økter / ${result.weeklyOverview.lowLoadDays} lavdag`;
    renderList("#weeklyAssessment", result.weeklyOverview.strictAssessment);
    renderList("#nextFocus", result.weeklyOverview.nextWeekFocus);

    $("#aiPrompt").value = AiCoachAdapter.buildManualPrompt(aiPayload);
    $("#engineOutput").textContent = JSON.stringify({ result, history }, null, 2);
  }

  function renderTodayLists() {
    const today = TrainingLog.todayIso();
    const sessions = TrainingLog.getSessionsForDate(today);
    const planned = WeeklyPlanner.readPlanItems().filter((item) => item.date === today);
    renderMobileItems(
      "#todayPlannedList",
      planned,
      (item) => `${item.startTime ? `${item.startTime} - ` : ""}${item.title} (${item.durationMin} min)`
    );
    renderMobileItems(
      "#todayDoneList",
      sessions,
      (session) => `${session.name} - ${session.durationMin} min - RPE ${session.rpe || "-"}`
    );
  }

  function renderCalendar(history) {
    const weekStart = WeeklyPlanner.startOfWeek(TrainingLog.todayIso());
    const dates = WeeklyPlanner.weekDates(weekStart);
    $("#calendarWeekLabel").textContent = `${dates[0]} til ${dates[6]}`;
    const cards = $("#calendarWeekCards");
    cards.innerHTML = "";
    dates.forEach((date, index) => {
      const sessions = TrainingLog.getSessionsForDate(date);
      const status = TrainingLog.getDailyStatusForDate(date);
      const minutes = sessions.reduce((sum, session) => sum + Number(session.durationMin || 0), 0);
      const hardCount = sessions.filter((session) => session.hard).length;
      const intensity = hardCount ? "hard" : minutes ? "moderate" : "easy";
      const button = document.createElement("button");
      button.type = "button";
      button.className = `calendar-day-card ${intensity} ${date === selectedCalendarDate ? "is-selected" : ""}`;
      button.innerHTML = `
        <span>${WeeklyPlanner.dayNames[index]}</span>
        <strong>${date.slice(8)}</strong>
        <em>${sessions.length} økt${sessions.length === 1 ? "" : "er"} / ${minutes} min</em>
        <small>${hardCount ? "hard" : minutes ? "moderat" : "lett/hvile"} · ${
          status.sleepScore ? `søvn ${status.sleepScore}` : status.hrvValue ? `HRV ${status.hrvValue}` : "ingen status"
        }</small>`;
      button.addEventListener("click", () => {
        selectedCalendarDate = date;
        editDateInput.value = date;
        sessionForm.elements.date.value = date;
        lockedPlanForm.elements.date.value = date;
        dailyEnergyForm.elements.date.value = date;
        loadDailyStatusForDate(date, true);
        render();
      });
      cards.appendChild(button);
    });
    renderDayDetail(selectedCalendarDate, history);
  }

  function renderDayDetail(date) {
    const sessions = TrainingLog.getSessionsForDate(date);
    const planned = WeeklyPlanner.readPlanItems().filter((item) => item.date === date);
    const status = TrainingLog.getDailyStatusForDate(date);
    const energy = TrainingLog.getDailyEnergyForDate(date);
    const minutes = sessions.reduce((sum, session) => sum + Number(session.durationMin || 0), 0);
    const activeCalories = sessions.reduce(
      (sum, session) => sum + Number(session.activeCalories || session.caloriesBurned || 0),
      0
    );
    const hardCount = sessions.filter((session) => session.hard).length;
    $("#dayDetailTitle").textContent = date;
    $("#dayDetailLoad").textContent = `${minutes} min`;
    $("#dayDetailSleep").textContent = status.sleepScore || "-";
    $("#dayDetailHrv").textContent = status.hrvValue ? `${status.hrvValue} ms` : "-";
    $("#dayDetailCalories").textContent = `${activeCalories} kcal`;
    $("#dayDetailHardness").textContent = hardCount ? `${hardCount} hard` : minutes ? "lett/moderat" : "hvile";
    renderMobileItems(
      "#dayDetailPlanned",
      planned,
      (item) => `${item.startTime ? `${item.startTime} - ` : ""}${item.title} (${item.durationMin} min)`
    );
    renderMobileItems(
      "#dayDetailDone",
      sessions,
      (session) => `${session.name} - ${session.durationMin} min - RPE ${session.rpe || "-"}`
    );
    $("#dayDetailNotes").textContent = [status.notes, energy.notes].filter(Boolean).join(" / ") || "Ingen notater.";
  }

  function renderStats(history) {
    document.querySelectorAll("[data-stats-range]").forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.statsRange) === statsRange);
    });
    const sessions = getSessionsForLastDays(statsRange);
    const statuses = getStatusesForLastDays(statsRange);
    const totalMinutes = sessions.reduce((sum, session) => sum + Number(session.durationMin || 0), 0);
    const activeCalories = sessions.reduce(
      (sum, session) => sum + Number(session.activeCalories || session.caloriesBurned || 0),
      0
    );
    const cards = [
      ["Tid", `${round1(totalMinutes / 60)} t`],
      ["Okter", sessions.length],
      ["Harde", sessions.filter((session) => session.hard).length],
      ["TKD", countSessionGroup(sessions, "tkd")],
      ["Sparring", countSessionGroup(sessions, "sparring")],
      ["Sykkel", countSessionGroup(sessions, "bike")],
      ["Styrke", countSessionGroup(sessions, "strength")],
      ["Snitt søvn", average(statuses.map((entry) => entry.totalSleepHours).filter(Boolean)) || "-"],
      ["Søvnscore", average(statuses.map((entry) => entry.sleepScore).filter(Boolean)) || "-"],
      ["HRV", average(statuses.map((entry) => entry.hrvValue).filter(Boolean)) || "-"],
      ["Hvilepuls", average(statuses.map((entry) => entry.restingHr).filter(Boolean)) || "-"],
      ["Body Battery", average(statuses.map((entry) => entry.bodyBatteryMorning).filter(Boolean)) || "-"],
      ["Rygg", history.backPainTrend],
      ["Aktive kcal", `${activeCalories}`],
    ];
    $("#statsCards").innerHTML = cards
      .map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`)
      .join("");
    renderList("#statsFlags", buildStatsFlags(sessions, statuses, history), "Ingen tydelige flagg.");
  }

  function renderMobileItems(selector, items, formatter) {
    const node = $(selector);
    node.innerHTML = "";
    if (!items.length) {
      node.textContent = "Ingen.";
      return;
    }
    items.forEach((item) => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "mobile-item";
      pill.textContent = formatter(item);
      if (item.id && item.durationMin !== undefined) {
        pill.addEventListener("click", () => {
          if (item.name) {
            fillSessionForm(item);
            switchTab("log");
          } else {
            fillLockedPlanForm(item);
            switchTab("log");
          }
        });
      }
      node.appendChild(pill);
    });
  }

  function getSessionsForLastDays(days) {
    const end = new Date(`${TrainingLog.todayIso()}T23:59:59`);
    const start = new Date(end);
    start.setDate(start.getDate() - Number(days || 7) + 1);
    return TrainingLog.readSessions().filter((session) => {
      const date = new Date(`${session.date}T12:00:00`);
      return date >= start && date <= end;
    });
  }

  function getStatusesForLastDays(days) {
    const end = new Date(`${TrainingLog.todayIso()}T23:59:59`);
    const start = new Date(end);
    start.setDate(start.getDate() - Number(days || 7) + 1);
    return TrainingLog.readDailyStatuses().filter((status) => {
      const date = new Date(`${status.date}T12:00:00`);
      return date >= start && date <= end;
    });
  }

  function average(values) {
    const valid = values.map(Number).filter((value) => Number.isFinite(value) && value > 0);
    if (!valid.length) return 0;
    return round1(valid.reduce((sum, value) => sum + value, 0) / valid.length);
  }

  function round1(value) {
    return Math.round(Number(value || 0) * 10) / 10;
  }

  function countSessionGroup(sessions, group) {
    const groups = {
      tkd: ["tkd_pattern", "tkd_sparring_drills", "tkd_sparring_rounds", "tkd_comp_sparring", "tkd_special_technique", "tkd_comp_pattern", "tkd_comp_special_technique"],
      sparring: ["tkd_sparring_drills", "tkd_sparring_rounds", "tkd_comp_sparring"],
      bike: ["base", "recovery", "tempo", "threshold", "conditioning", "anaerobic_capacity", "sprint"],
      strength: ["strength", "upper_strength", "heavy_legs"],
    };
    return sessions.filter((session) => groups[group]?.includes(session.type)).length;
  }

  function buildStatsFlags(sessions, statuses, history) {
    const flags = [];
    const hardCount = sessions.filter((session) => session.hard).length;
    const avgSleep = average(statuses.map((entry) => entry.totalSleepHours));
    const lowHrv = statuses.filter((entry) => ["low", "very_low", "unbalanced"].includes(entry.hrvStatus)).length;
    const highResting = statuses.filter((entry) => Number(entry.restingHrDelta || 0) >= 5).length;
    const baseRecovery = sessions.filter((session) => ["base", "recovery", "mobility"].includes(session.type)).length;
    if (hardCount > Math.ceil(statsRange / 2.5)) flags.push("For mange harde økter.");
    if (avgSleep && avgSleep < 7) flags.push("Lite søvn.");
    if (lowHrv >= 2) flags.push("HRV lavere enn normalt.");
    if (highResting >= 2) flags.push("Hvilepuls høyere enn normalt.");
    if (history.backPainTrend === "rising") flags.push("Ryggsmerte øker.");
    if (countSessionGroup(sessions, "tkd") < 2 && statsRange >= 7) flags.push("Lite TKD-spesifikk trening.");
    if (baseRecovery < 2 && sessions.length >= 4) flags.push("Lite recovery/base.");
    return flags;
  }

  async function copyChatGptExport(days) {
    const report = buildChatGptReport(days);
    $("#aiPrompt").value = report;
    try {
      await navigator.clipboard.writeText(report);
      $("#aiStatus").textContent = `${days} dager kopiert til ChatGPT`;
    } catch (_error) {
      $("#aiPrompt").select();
      $("#aiStatus").textContent = "Marker rapporten og kopier manuelt";
    }
    switchTab("export");
  }

  function readDailyReportForm() {
    const form = $("#dailyReportForm");
    return {
      date: form.elements.date.value || TrainingLog.todayIso(),
      feltGood: form.elements.feltGood.value,
      feltBad: form.elements.feltBad.value,
      legs: form.elements.legs.value,
      back: form.elements.back.value,
      qualityVsExpected: form.elements.qualityVsExpected.value,
      planFollowed: form.elements.planFollowed.value,
      unsureAbout: form.elements.unsureAbout.value,
      coachQuestion: form.elements.coachQuestion.value,
    };
  }

  function fillDailyReportForm(report) {
    const form = $("#dailyReportForm");
    if (!form) return;
    const data = report || TrainingLog.getDailyReportForDate(TrainingLog.todayIso());
    form.elements.date.value = data.date || TrainingLog.todayIso();
    form.elements.feltGood.value = data.feltGood || "";
    form.elements.feltBad.value = data.feltBad || "";
    form.elements.legs.value = data.legs || "";
    form.elements.back.value = data.back || "";
    form.elements.qualityVsExpected.value = data.qualityVsExpected || "";
    form.elements.planFollowed.value = data.planFollowed || "partly";
    form.elements.unsureAbout.value = data.unsureAbout || "";
    form.elements.coachQuestion.value = data.coachQuestion || "";
  }

  function saveDailyReportFromForm() {
    const saved = TrainingLog.saveDailyReport(readDailyReportForm());
    fillDailyReportForm(saved);
    $("#dailyReportStatus").textContent = `Lagret ${saved.date}`;
    render();
    return saved;
  }

  function renderDailyReportPanel() {
    const form = $("#dailyReportForm");
    if (!form) return;
    if (!form.elements.date.value) {
      form.elements.date.value = TrainingLog.todayIso();
    }
    const exportDate = $("#exportDate");
    if (exportDate && !exportDate.value) {
      exportDate.value = form.elements.date.value || TrainingLog.todayIso();
    }
    const date = form.elements.date.value || TrainingLog.todayIso();
    const status = TrainingLog.getDailyStatusForDate(date);
    const sessions = TrainingLog.getSessionsForDate(date);
    const saved = TrainingLog.readDailyReports().find((entry) => entry.date === date);
    $("#dailyReportStatus").textContent = saved ? `Lagret ${saved.date}` : "Ikke lagret";
    $("#dailyReportAutoSummary").innerHTML = [
      `Søvn: ${status.totalSleepHours || "-"} t / score ${status.sleepScore || "-"}`,
      `HRV: ${status.hrvValue || "-"} ms / ${status.hrvStatus || "-"}`,
      `Hvilepuls: ${status.restingHr || "-"} bpm`,
      `Body Battery: ${status.bodyBatteryMorning || "-"}`,
      `Rygg/bein: ${status.backPain || 0}/10 / ${status.legSoreness || 0}/10`,
      `Økter: ${sessions.length ? sessions.map((session) => `${session.name} (${session.durationMin} min)`).join("; ") : "ingen"}`,
    ]
      .map((line) => `<div class="mobile-item static-item">${escapeHtml(line)}</div>`)
      .join("");
  }

  async function copyDailyReport(source) {
    let date = TrainingLog.todayIso();
    if (source === "selected") {
      saveDailyReportFromForm();
      date = $("#dailyReportDate").value || TrainingLog.todayIso();
    } else if (source === "export-date") {
      date = $("#exportDate").value || TrainingLog.todayIso();
      fillDailyReportForm(TrainingLog.getDailyReportForDate(date));
    }
    const report = buildDailyReportText(date, source === "selected" ? readDailyReportForm() : TrainingLog.getDailyReportForDate(date));
    $("#aiPrompt").value = report;
    try {
      await navigator.clipboard.writeText(report);
      $("#aiStatus").textContent = `Dagsrapport kopiert: ${date}`;
    } catch (_error) {
      $("#aiPrompt").select();
      $("#aiStatus").textContent = "Marker rapporten og kopier manuelt";
    }
    switchTab("export");
  }

  function buildDailyReportText(date, reportInput) {
    const status = TrainingLog.getDailyStatusForDate(date);
    const sessions = TrainingLog.getSessionsForDate(date);
    const report = reportInput || TrainingLog.getDailyReportForDate(date);
    const planFollowedLabels = { yes: "Ja", partly: "Delvis", no: "Nei" };
    const lines = [
      "Her er dagsrapporten min. Analyser som streng prestasjonscoach for ITF-sparring. Prioriter World Cup/NM/EM-prestasjon, sparringskvalitet, rygg-hensyn og smart belastningsstyring.",
      "",
      "DATO:",
      date,
      "",
      "GARMIN / SØVN:",
      `- Søvn: ${status.totalSleepHours || "-"}`,
      `- Søvnscore: ${status.sleepScore || "-"}`,
      `- Leggetid: ${status.bedtime || "-"}`,
      `- Oppvåkning: ${status.wakeTime || "-"}`,
      `- REM: ${status.remSleepHours || "-"}`,
      `- Dyp: ${status.deepSleepHours || "-"}`,
      `- Lett: ${status.lightSleepHours || "-"}`,
      `- Våken: ${status.awakeHours || "-"}`,
      `- HRV: ${status.hrvValue || "-"}`,
      `- HRV-status: ${status.hrvStatus && status.hrvStatus !== "unknown" ? status.hrvStatus : "-"}`,
      `- Hvilepuls: ${status.restingHr || "-"}`,
      `- Body Battery: ${status.bodyBatteryMorning || "-"}`,
      `- Stress: ${status.stressLevel && status.stressLevel !== "unknown" ? status.stressLevel : "-"}`,
      `- Energi: ${status.energy || "-"}`,
      `- Motivasjon: ${status.motivation || "-"}`,
      `- Rygg: ${status.backPain || 0}/10`,
      `- Bein: ${status.legSoreness || 0}/10`,
      "",
      "ØKTER I DAG:",
    ];
    if (!sessions.length) {
      lines.push("- Ingen økter logget.");
    } else {
      sessions.forEach((session, index) => {
        lines.push(`Økt ${index + 1}:`);
        lines.push(`- Type: ${TrainingLog.sessionTypes[session.type] || session.type}`);
        lines.push(`- Tittel: ${session.name || "-"}`);
        lines.push(`- Varighet: ${session.durationMin || 0} min`);
        lines.push(`- RPE: ${session.rpe || "-"}`);
        lines.push(`- Intensitet: ${session.intensity || "-"}`);
        lines.push(`- Snittpuls: ${session.avgPulse || "-"}`);
        lines.push(`- Makspuls: ${session.maxPulse || "-"}`);
        lines.push(`- Aktive kalorier: ${session.activeCalories || 0}`);
        lines.push(`- Rygg etter: ${session.backPainAfter || 0}/10`);
        lines.push(`- Bein etter: ${session.legFatigueAfter || 0}/10`);
        lines.push(`- Notat: ${session.notes || "-"}`);
        const extra = [];
        if (session.sparringRounds) extra.push(`sparring ${session.sparringRounds} runder (${session.roundFormat || "ukjent format"})`);
        if (session.sparringWorked) extra.push(`fungerte: ${session.sparringWorked}`);
        if (session.sparringImprove) extra.push(`forbedre: ${session.sparringImprove}`);
        if (session.intervalReps) extra.push(`intervall: ${session.intervalReps} x ${session.intervalWork || "?"}, pause ${session.intervalRest || "?"}`);
        if (session.aerobicTrainingEffect || session.anaerobicTrainingEffect) extra.push(`TE aerob/anaerob: ${session.aerobicTrainingEffect || 0}/${session.anaerobicTrainingEffect || 0}`);
        lines.push(`- Sparring/intervall-detaljer hvis registrert: ${extra.length ? extra.join("; ") : "-"}`);
      });
    }
    lines.push("");
    lines.push("DAGSRAPPORT:");
    lines.push(`- Hva føltes bra: ${report.feltGood || "-"}`);
    lines.push(`- Hva føltes dårlig: ${report.feltBad || "-"}`);
    lines.push(`- Bein: ${report.legs || "-"}`);
    lines.push(`- Rygg: ${report.back || "-"}`);
    lines.push(`- Kvalitet vs forventet: ${report.qualityVsExpected || "-"}`);
    lines.push(`- Plan fulgt: ${planFollowedLabels[report.planFollowed] || report.planFollowed || "-"}`);
    lines.push(`- Usikker på: ${report.unsureAbout || "-"}`);
    lines.push(`- Spørsmål til coach: ${report.coachQuestion || "-"}`);
    lines.push("");
    lines.push("SPØRSMÅL:");
    lines.push("Hva betyr denne dagen for treningen min, og hva bør jeg gjøre i morgen?");
    return lines.join("\n");
  }

  function buildChatGptReport(days) {
    const rangeDays = Number(days || 7);
    const dates = [];
    const end = new Date(`${TrainingLog.todayIso()}T12:00:00`);
    for (let offset = rangeDays - 1; offset >= 0; offset -= 1) {
      const date = new Date(end);
      date.setDate(date.getDate() - offset);
      dates.push(date.toISOString().slice(0, 10));
    }
    const sessions = TrainingLog.readSessions();
    const statuses = TrainingLog.readDailyStatuses();
    const plans = WeeklyPlanner.readPlanItems();
    const history = TrainingLog.analyzeHistory(sessions);
    const rangeSessions = sessions.filter((session) => dates.includes(session.date));
    const totalMinutes = rangeSessions.reduce((sum, session) => sum + Number(session.durationMin || 0), 0);
    const activeCalories = rangeSessions.reduce(
      (sum, session) => sum + Number(session.activeCalories || session.caloriesBurned || 0),
      0
    );
    const lines = [
      "TKD Performance Log eksport",
      "",
      "Utøverprofil:",
      "- Junior ITF Taekwon-Do, sparring",
      "- 16 år, ca. 181 cm / 65 kg",
      "- Rygg: buking i mellomvirvelskive",
      "- Kondisjon helst på sykkel",
      "- Mål: World Cup topp 5, NM-gull, EM-medalje",
      "",
      `Datoområde: ${dates[0]} til ${dates[dates.length - 1]}`,
      "",
      "Dag for dag:",
    ];
    dates.forEach((date) => {
      const status = statuses.find((entry) => entry.date === date) || {};
      const daySessions = sessions.filter((session) => session.date === date);
      const dayPlans = plans.filter((plan) => plan.date === date);
      lines.push(`\n${date}`);
      lines.push(
        `Status: søvn ${status.totalSleepHours || "-"} t, søvnscore ${status.sleepScore || "-"}, REM ${status.remSleepHours || "-"}, dyp ${status.deepSleepHours || "-"}, lett ${status.lightSleepHours || "-"}, våken ${status.awakeHours || "-"}, HRV ${status.hrvValue || "-"} (${status.hrvStatus || "-"}), hvilepuls ${status.restingHr || "-"}, Body Battery ${status.bodyBatteryMorning || "-"}, stress ${status.stressLevel || "-"}, rygg ${status.backPain || "-"}, bein ${status.legSoreness || "-"}`
      );
      lines.push(
        `Planlagt: ${
          dayPlans.length
            ? dayPlans.map((plan) => `${plan.title} (${plan.durationMin} min, ${plan.plannedIntensity || "moderat"})`).join("; ")
            : "ingen"
        }`
      );
      lines.push(
        `Gjennomført: ${
          daySessions.length
            ? daySessions
                .map(
                  (session) =>
                    `${session.name} (${session.durationMin} min, RPE ${session.rpe || "-"}, avg ${session.avgPulse || "-"}, max ${session.maxPulse || "-"}, ${session.activeCalories || 0} kcal, rygg etter ${session.backPainAfter || 0}, notat: ${session.notes || "-"})`
                )
                .join("; ")
            : "ingen"
        }`
      );
      if (status.notes) lines.push(`Statusnotat: ${status.notes}`);
    });
    lines.push("");
    lines.push("Oppsummering:");
    lines.push(`- Total treningstid: ${round1(totalMinutes / 60)} timer`);
    lines.push(`- Aktive kalorier: ${activeCalories}`);
    lines.push(`- Harde økter: ${rangeSessions.filter((session) => session.hard).length}`);
    lines.push(`- TKD/sparring/sykkel/styrke: ${countSessionGroup(rangeSessions, "tkd")}/${countSessionGroup(rangeSessions, "sparring")}/${countSessionGroup(rangeSessions, "bike")}/${countSessionGroup(rangeSessions, "strength")}`);
    lines.push(`- Snitt søvn: ${average(statuses.filter((entry) => dates.includes(entry.date)).map((entry) => entry.totalSleepHours)) || "-"}`);
    lines.push(`- Snitt HRV: ${average(statuses.filter((entry) => dates.includes(entry.date)).map((entry) => entry.hrvValue)) || "-"}`);
    lines.push(`- Snitt hvilepuls: ${average(statuses.filter((entry) => dates.includes(entry.date)).map((entry) => entry.restingHr)) || "-"}`);
    lines.push(`- Ryggtrend: ${history.backPainTrend}`);
    lines.push("");
    lines.push(
      "Spørsmål: Analyser loggen for ITF-sparring. Hva var bra, hva bør justeres, og hvilke spørsmål bør jeg ta med videre?"
    );
    return lines.join("\n");
  }

  function renderHistory(history) {
    $("#progressSummary").textContent =
      history.last7Hours >= 20 ? "20+ timer, kontroller hardheten" : "Bygg volum smart";
    $("#hours7").textContent = `${history.last7Hours} t`;
    $("#avgHours28").textContent = `${history.avgWeeklyHours28} t`;
    $("#hard7").textContent = `${history.hardSessions7}`;
    $("#backTrend").textContent = history.backPainTrend;
    $("#activeCalories7").textContent = `${history.calories7.activeBurned} kcal`;
    $("#restingCalories7").textContent = `${history.calories7.restingBurned} kcal`;
    $("#consumedCalories7").textContent = `${history.calories7.consumed} kcal`;
    $("#calorieDaysLogged").textContent = `${history.calories7.daysLogged}/7`;
    $("#avgSleepScore7").textContent = history.dailyStatus7.avgSleepScore
      ? `${history.dailyStatus7.avgSleepScore}/100`
      : "-";
    $("#avgHrv7").textContent = history.dailyStatus7.avgHrv ? `${history.dailyStatus7.avgHrv} ms` : "-";
    $("#avgBodyBattery7").textContent = history.dailyStatus7.avgBodyBatteryMorning
      ? `${history.dailyStatus7.avgBodyBatteryMorning}/100`
      : "-";
    $("#dailyStatusDays7").textContent = `${history.dailyStatus7.daysLogged}/7`;
    renderList("#progressFlags", history.progressFlags, "Ikke nok data ennå. Logg øktene, ellers gjetter coachen.");
    renderList("#historyRecommendations", history.recommendations);
  }

  function renderDailyStatus(history) {
    const date = coachForm.elements.statusDate.value || TrainingLog.todayIso();
    const saved = TrainingLog.readDailyStatuses().find((entry) => entry.date === date);
    const live = readDailyStatusForm();
    const preview = live;
    renderSleepStageWarning(live);
    $("#dailyStatusSummary").textContent = saved
      ? `${date}: score ${preview.sleepScore || "-"} / søvn ${preview.totalSleepHours || "-"} t`
      : `${date}: ikke lagret`;
    $("#latestSleepStatus").textContent = `${preview.totalSleepHours || "-"} t / score ${
      preview.sleepScore || "-"
    }`;
    $("#latestSleepStages").textContent = `REM ${preview.remSleepHours || 0} / dyp ${
      preview.deepSleepHours || 0
    } / lett ${preview.lightSleepHours || 0}`;
    $("#latestHrvResting").textContent = `${preview.hrvValue || "-"} ms / ${
      preview.restingHr || "-"
    } bpm`;
    $("#latestBatteryStress").textContent = `${preview.bodyBatteryMorning || "-"} -> ${
      preview.bodyBatteryEvening || "-"
    } / ${stressLabel(preview.stressLevel)}`;
    renderList("#dailyStatusFlags", buildDailyStatusFlags(readDailyStatusForm(), history));
  }

  function renderSleepStageWarning(status) {
    const totalSleep = Number(status.totalSleepHours || status.sleepHours || 0);
    const stageTotal = Number(status.stageTotalHours || 0) ||
      Number(status.remSleepHours || 0) +
        Number(status.deepSleepHours || 0) +
        Number(status.lightSleepHours || 0) +
        Number(status.awakeHours || 0);
    const mismatch = Math.round((stageTotal - totalSleep) * 10) / 10;
    if (!totalSleep || !stageTotal || Math.abs(mismatch) <= 0.3) {
      $("#sleepStageWarning").textContent = "";
      return;
    }
    $("#sleepStageWarning").textContent = `Søvnstadier summerer til ${Math.round(stageTotal * 10) / 10} t, som avviker ${mismatch > 0 ? "+" : ""}${mismatch} t fra total søvn. Lagring er fortsatt tillatt.`;
  }

  function buildDailyStatusFlags(status, history) {
    const flags = [];
    if (status.sleepScore && status.sleepScore < 60) {
      flags.push("Lav søvnscore. Ikke bruk grønn følelse som bevis på at hardøkt er smart.");
    }
    if (status.totalSleepHours && status.totalSleepHours < 7) {
      flags.push("Søvn under 7 timer. Kvalitet først, ikke ekstra volum.");
    }
    if (["low", "very_low", "unbalanced"].includes(status.hrvStatus)) {
      flags.push("HRV-status er ikke bra. Hard intervall må ha tydelig grunn.");
    }
    if (status.bodyBatteryMorning && status.bodyBatteryMorning < 40) {
      flags.push("Lav Body Battery på morgenen. Se etter teknikk/base før hard kondisjon.");
    }
    if (status.stressLevel === "high") {
      flags.push("Høyt stressnivå. Ikke legg på ekstra hardhet bare for å føle kontroll.");
    }
    if (history.hardSessions7 >= 3 && (status.sleepScore < 70 || status.hrvStatus === "low")) {
      flags.push("Mange harde økter + svak recovery. Kutt hardhet før du kutter søvn.");
    }
    return flags.length ? flags : ["Ingen tydelige Garmin-flagg på valgt dato."];
  }

  function stressLabel(value) {
    return {
      low: "lav",
      moderate: "moderat",
      high: "høy",
      unknown: "ukjent",
    }[value] || "ukjent";
  }

  function renderWeek(history) {
    const body = $("#weekSessions");
    body.innerHTML = "";
    const sessions = history.thisWeek.slice().sort((a, b) => `${a.date} ${a.createdAt}`.localeCompare(`${b.date} ${b.createdAt}`));
    if (!sessions.length) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="8">Ingen økter logget denne uka.</td>`;
      body.appendChild(row);
      return;
    }

    sessions.forEach((session) => {
      const row = document.createElement("tr");
      row.innerHTML = [
        `<td>${escapeHtml(session.date)}</td>`,
        `<td>${escapeHtml(session.name || TrainingLog.sessionTypes[session.type])}</td>`,
        `<td>${session.durationMin}</td>`,
        `<td>${session.rpe || "-"}</td>`,
        `<td>${session.hard ? "Ja" : "Nei"}</td>`,
        `<td>${session.backPainAfter || 0}/10</td>`,
        `<td>${session.activeCalories || session.caloriesBurned || 0}</td>`,
        `<td><button type="button" data-edit="${session.id}">Rediger</button></td>`,
      ].join("");
      body.appendChild(row);
    });

    body.querySelectorAll("[data-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const session = TrainingLog.readSessions().find((item) => item.id === button.dataset.edit);
        if (session) fillSessionForm(session);
      });
    });
  }

  function renderSelectedDate() {
    const container = $("#selectedDateSessions");
    const date = editDateInput.value || TrainingLog.todayIso();
    const sessions = TrainingLog.getSessionsForDate(date);
    container.innerHTML = "";
    if (!sessions.length) {
      container.textContent = "Ingen økter på valgt dato.";
      return;
    }
    sessions.forEach((session) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "session-pill";
      button.textContent = `${session.name} - ${session.durationMin} min - RPE ${session.rpe || "-"}`;
      button.addEventListener("click", () => fillSessionForm(session));
      container.appendChild(button);
    });
  }

  function renderPlanner(history) {
    const competition = WeeklyPlanner.readCompetition();
    const weekStart = plannerForm.elements.weekStart.value || WeeklyPlanner.startOfWeek(TrainingLog.todayIso());
    const planItems = WeeklyPlanner.getPlanItemsForWeek(weekStart);
    const plan = WeeklyPlanner.createWeeklyPlan({
      history,
      planItems,
      competition,
      targetHours: numberValue(plannerForm, "targetHours") || 18,
      weekStart,
      manualPhase: coachForm.elements.trainingPhase.value,
      competitionMode: plannerForm.elements.competitionMode.value || coachForm.elements.competitionMode.value,
    });

    $("#plannerSummary").textContent = `${plan.phaseLabel}: ${plan.totalHours} t planlagt (${plan.hardCount}/${plan.hardBudget} harde)`;
    const body = $("#weekPlanBody");
    body.innerHTML = "";
    plan.dates.forEach((date, index) => {
      const locked = plan.locked.filter((item) => item.date === date);
      const suggestions = plan.suggestions.filter((item) => item.date === date);
      const row = document.createElement("tr");
      row.innerHTML = [
        `<td>${WeeklyPlanner.dayNames[index]}</td>`,
        `<td>${date}</td>`,
        `<td>${locked.length ? locked.map(formatPlanItem).join("<br>") : "-"}</td>`,
        `<td>${suggestions.length ? suggestions.map(formatPlanItem).join("<br>") : "-"}</td>`,
        `<td>${sumPlanMinutes(locked.concat(suggestions))}</td>`,
      ].join("");
      body.appendChild(row);
    });

    body.querySelectorAll("[data-plan-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = WeeklyPlanner.readPlanItems().find((entry) => entry.id === button.dataset.planEdit);
        if (item) fillLockedPlanForm(item);
      });
    });

    $("#weeklyReviewSummary").textContent = plan.review.summary;
    renderList("#weeklyReviewFindings", plan.review.findings);
    renderList("#weeklyReviewActions", plan.review.nextActions);
  }

  function formatPlanItem(item) {
    const label = item.title || WeeklyPlanner.lockedTypes[item.type] || item.type;
    const intensityLabel = { easy: "lett", moderate: "moderat", hard: "hard" }[item.plannedIntensity] || "";
    const meta = `${item.startTime ? `${item.startTime}, ` : ""}${item.durationMin} min${
      item.hard ? ", hard" : intensityLabel ? `, ${intensityLabel}` : ""
    }${item.focus ? `, ${escapeHtml(item.focus)}` : ""}`;
    if (item.locked) {
      return `${escapeHtml(label)} <span class="muted-inline">(${meta})</span> <button type="button" data-plan-edit="${item.id}">Rediger</button>`;
    }
    return `${escapeHtml(label)} <span class="muted-inline">(${meta})</span>`;
  }

  function sumPlanMinutes(items) {
    return items.reduce((sum, item) => sum + Number(item.durationMin || 0), 0);
  }

  function renderList(selector, items, emptyText) {
    const node = $(selector);
    node.innerHTML = "";
    const safeItems = Array.isArray(items) && items.length ? items : [emptyText || "Ingen."];
    safeItems.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      node.appendChild(li);
    });
  }

  function buildCoachLine(result, history) {
    const sessionTitle = result.session?.title || "ingen hovedøkt";
    const volumeLine =
      history.last7Hours >= 20
        ? "Du tåler høyt volum, men 20 timer gir bare mening når hardheten er kontrollert."
        : `Du er på ${history.last7Hours} timer siste 7 dager. Hvis vi øker, kommer volumet fra base, teknikk og recovery først.`;

    if (result.readiness.category === "red") {
      return `Dette er ikke dagen for a bevise noe. ${result.explanation} ${volumeLine} Dagens valg: ${sessionTitle}.`;
    }
    if (result.readiness.category === "yellow") {
      return `Du får trene, men ikke diktere intensiteten med motivasjon. ${result.explanation} ${volumeLine} Dagens økt: ${sessionTitle}.`;
    }
    return `Du er grønn, men det betyr ikke maks. ${result.explanation} ${volumeLine} Dagens økt: ${sessionTitle}.`;
  }

  function formatCalories(value) {
    if (!value) return "0 kcal";
    return value > 0 ? `+${value} kcal` : `${value} kcal`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function loadAiConfig() {
    const config = AiCoachAdapter.readConfig();
    $("#aiMode").value = config.mode;
    $("#aiEndpoint").value = config.endpoint;
    $("#aiModel").value = config.model;
  }

  function saveAiConfig() {
    AiCoachAdapter.saveConfig({
      mode: $("#aiMode").value,
      endpoint: $("#aiEndpoint").value,
      model: $("#aiModel").value,
    });
    $("#aiStatus").textContent = "Oppsett lagret";
  }

  async function copyAiPrompt() {
    const text = $("#aiPrompt").value;
    try {
      await navigator.clipboard.writeText(text);
      $("#aiStatus").textContent = "AI-analysepakke kopiert";
    } catch (_error) {
      $("#aiPrompt").select();
      $("#aiStatus").textContent = "Marker teksten og kopier manuelt";
    }
  }

  async function runRemoteAi() {
    saveAiConfig();
    const payload = TrainingLog.createAiPayload({
      coachInput: buildCoachInput(),
      coachPlan: CoachEngine.selectPlan(buildCoachInput()),
    });
    $("#aiStatus").textContent = "Sender til backend...";
    try {
      const response = await AiCoachAdapter.requestRemoteAnalysis(payload);
      $("#aiPrompt").value = JSON.stringify(response, null, 2);
      $("#aiStatus").textContent = "Backend-analyse mottatt";
    } catch (error) {
      $("#aiStatus").textContent = error.message;
    }
  }

  function buildBackup() {
    return TrainingLog.createBackup({
      aiConfig: AiCoachAdapter.readConfig(),
      planner: WeeklyPlanner.createBackup({
        targetHours: plannerForm.elements.targetHours.value || "18",
      }),
      note:
        "Denne backupen inneholder treningslogg, Garmin/dagsstatus, dagsrapporter, dagskalorier og planlagte økter. Den er ikke kryptert.",
    });
  }

  function exportBackupToText() {
    const backup = buildBackup();
    $("#backupText").value = JSON.stringify(backup, null, 2);
    $("#backupStatus").textContent = `Backup klar: ${backup.sessions.length} økter, ${backup.dailyStatuses.length} Garmin-dager, ${backup.dailyReports?.length || 0} dagsrapporter`;
  }

  async function copyBackupText() {
    if (!$("#backupText").value.trim()) {
      exportBackupToText();
    }
    try {
      await navigator.clipboard.writeText($("#backupText").value);
      $("#backupStatus").textContent = "Backup kopiert";
    } catch (_error) {
      $("#backupText").select();
      $("#backupStatus").textContent = "Marker teksten og kopier manuelt";
    }
  }

  function downloadBackup() {
    const backup = buildBackup();
    const text = JSON.stringify(backup, null, 2);
    $("#backupText").value = text;
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tkd-performance-log-backup-${TrainingLog.todayIso()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    $("#backupStatus").textContent = "Backup-fil lastet ned";
  }

  function importBackupFromText() {
    const text = $("#backupText").value.trim();
    if (!text) {
      $("#backupStatus").textContent = "Lim inn backuptekst forst";
      return;
    }
    try {
      restoreBackup(JSON.parse(text));
    } catch (error) {
      $("#backupStatus").textContent = error.message;
    }
  }

  function importBackupFromFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        $("#backupText").value = String(reader.result || "");
        restoreBackup(JSON.parse($("#backupText").value));
      } catch (error) {
        $("#backupStatus").textContent = error.message;
      } finally {
        event.target.value = "";
      }
    };
    reader.onerror = () => {
      $("#backupStatus").textContent = "Kunne ikke lese backupfilen";
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  function restoreBackup(backup) {
    const result = TrainingLog.restoreBackup(backup);
    if (result.extra?.aiConfig) {
      AiCoachAdapter.saveConfig(result.extra.aiConfig);
      loadAiConfig();
    }
    if (result.extra?.planner) {
      WeeklyPlanner.restoreBackup(result.extra.planner);
      if (result.extra.planner.extra?.targetHours) {
        localStorage.setItem("strictTkdTargetHours.v1", result.extra.planner.extra.targetHours);
      }
      loadPlannerForms();
    }
    resetSessionForm();
    fillDailyEnergyForm(TrainingLog.getDailyEnergyForDate(editDateInput.value || TrainingLog.todayIso()));
    loadDailyStatusForDate(coachForm.elements.statusDate.value || TrainingLog.todayIso(), true);
    render();
    $("#backupStatus").textContent = `Importert: ${result.sessions} økter, ${result.dailyStatuses} Garmin-dager, ${result.dailyReports || 0} dagsrapporter`;
  }

  init();
})();
