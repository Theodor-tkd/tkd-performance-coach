(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.TrainingLog = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  const STORAGE_KEY = "strictTkdTrainingLog.v1";
  const DAILY_ENERGY_KEY = "strictTkdDailyEnergy.v1";
  const DAILY_STATUS_KEY = "strictTkdDailyStatus.v1";
  const DAILY_REPORT_KEY = "tkdDailyReports.v1";

  const sessionTypes = {
    base: "Basis",
    recovery: "Restitusjon",
    tempo: "Tempo",
    threshold: "Terskel",
    conditioning: "Kondisjon",
    anaerobic_capacity: "Anaerob kapasitet",
    sprint: "Sprint",
    tkd_pattern: "TKD mønster",
    tkd_sparring_drills: "TKD sparring drills",
    tkd_sparring_rounds: "TKD sparring runder",
    tkd_comp_sparring: "TKD konkurransetrening sparring",
    tkd_special_technique: "TKD spesialteknikk",
    tkd_comp_pattern: "TKD konkurransetrening mønster",
    tkd_comp_special_technique: "TKD konkurransetrening spesialteknikk",
    strength: "Styrke",
    upper_strength: "Overkroppsstyrke",
    heavy_legs: "Tung beinokt",
    mobility: "Mobilitet/prehab",
    video: "Taktikk/video",
  };

  const typeAliases = {
    tempo_threshold: "threshold",
    specific_bike: "conditioning",
    intervals: "anaerobic_capacity",
    repeat_explosive: "sprint",
    tkd_technique: "tkd_sparring_drills",
    hard_sparring: "tkd_comp_sparring",
  };

  const hardConditioningTypes = ["threshold", "anaerobic_capacity", "sprint"];
  const competitionConditioningTypes = ["conditioning", "anaerobic_capacity", "sprint"];
  const baseRecoveryTypes = ["base", "recovery", "mobility"];
  const tkdTypes = [
    "tkd_pattern",
    "tkd_sparring_drills",
    "tkd_sparring_rounds",
    "tkd_comp_sparring",
    "tkd_special_technique",
    "tkd_comp_pattern",
    "tkd_comp_special_technique",
  ];

  function nowId() {
    return `s_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function todayIso() {
    return formatDate(new Date());
  }

  function readSessions() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.map(normalizeSession) : [];
    } catch (_error) {
      return [];
    }
  }

  function readDailyEnergy() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DAILY_ENERGY_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.map(normalizeDailyEnergy).sort(sortDailyDesc) : [];
    } catch (_error) {
      return [];
    }
  }

  function readDailyStatuses() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DAILY_STATUS_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.map(normalizeDailyStatus).sort(sortDailyDesc) : [];
    } catch (_error) {
      return [];
    }
  }

  function readDailyReports() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DAILY_REPORT_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.map(normalizeDailyReport).sort(sortDailyDesc) : [];
    } catch (_error) {
      return [];
    }
  }

  function writeDailyEnergy(entries) {
    localStorage.setItem(
      DAILY_ENERGY_KEY,
      JSON.stringify(entries.map(normalizeDailyEnergy).sort(sortDailyDesc))
    );
  }

  function writeDailyStatuses(entries) {
    localStorage.setItem(
      DAILY_STATUS_KEY,
      JSON.stringify(entries.map(normalizeDailyStatus).sort(sortDailyDesc))
    );
  }

  function writeDailyReports(entries) {
    localStorage.setItem(
      DAILY_REPORT_KEY,
      JSON.stringify(entries.map(normalizeDailyReport).sort(sortDailyDesc))
    );
  }

  function writeSessions(sessions) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(sessions.map(normalizeSession).sort(sortByDateDesc))
    );
  }

  function normalizeSession(session) {
    const type = normalizeType(session.type || "base");
    const rpe = toNumber(session.rpe);
    const avgPulse = toNumber(session.avgPulse);
    const maxPulse = toNumber(session.maxPulse);
    const activeCalories = toNumber(session.activeCalories ?? session.caloriesBurned);
    return {
      id: session.id || nowId(),
      date: session.date || todayIso(),
      type,
      name: session.name || session.title || sessionTypes[type] || "Okt",
      durationMin: toNumber(session.durationMin),
      rpe,
      avgPulse,
      maxPulse,
      intensity: session.intensity || (session.hard ? "hard" : rpe >= 6 ? "moderate" : "easy"),
      hard: Boolean(
        session.hard ||
          session.intensity === "hard" ||
          rpe >= 8 ||
          avgPulse >= 170 ||
          maxPulse >= 175 ||
          hardConditioningTypes.includes(type) ||
          type === "tkd_comp_sparring" ||
          type === "heavy_legs"
      ),
      activeCalories,
      caloriesBurned: activeCalories,
      backPainBefore: toNumber(session.backPainBefore),
      backPainAfter: toNumber(session.backPainAfter),
      legFatigueAfter: toNumber(session.legFatigueAfter),
      sparringQuality: toNumber(session.sparringQuality),
      footworkQuality: toNumber(session.footworkQuality),
      kickQualityUnderFatigue: toNumber(session.kickQualityUnderFatigue),
      offensiveCommit: toNumber(session.offensiveCommit),
      sparringRounds: toNumber(session.sparringRounds),
      roundFormat: session.roundFormat || "",
      sparringWorked: session.sparringWorked || "",
      sparringImprove: session.sparringImprove || "",
      intervalReps: toNumber(session.intervalReps),
      intervalWork: session.intervalWork || "",
      intervalRest: session.intervalRest || "",
      intervalBestPulse: toNumber(session.intervalBestPulse),
      intervalLastRepQuality: session.intervalLastRepQuality || "",
      aerobicTrainingEffect: toNumber(session.aerobicTrainingEffect),
      anaerobicTrainingEffect: toNumber(session.anaerobicTrainingEffect),
      plannedVsActual: session.plannedVsActual || "as_planned",
      notes: session.notes || "",
      createdAt: session.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function normalizeType(type) {
    return typeAliases[type] || type || "base";
  }

  function sortByDateDesc(a, b) {
    return `${b.date} ${b.createdAt}`.localeCompare(`${a.date} ${a.createdAt}`);
  }

  function sortDailyDesc(a, b) {
    return b.date.localeCompare(a.date);
  }

  function sortByDateAscList(sessions) {
    return sessions
      .slice()
      .sort((a, b) => `${a.date} ${a.createdAt}`.localeCompare(`${b.date} ${b.createdAt}`));
  }

  function saveSession(session) {
    const sessions = readSessions();
    const next = normalizeSession(session);
    const index = sessions.findIndex((item) => item.id === next.id);
    if (index >= 0) {
      next.createdAt = sessions[index].createdAt;
      sessions[index] = next;
    } else {
      sessions.push(next);
    }
    writeSessions(sessions);
    return next;
  }

  function normalizeDailyEnergy(entry) {
    return {
      date: entry.date || todayIso(),
      restingCalories: toNumber(entry.restingCalories),
      caloriesConsumed: toNumber(entry.caloriesConsumed),
      notes: entry.notes || "",
      updatedAt: new Date().toISOString(),
    };
  }

  function normalizeDailyStatus(entry) {
    const totalSleepHours = toNumber(entry.totalSleepHours ?? entry.sleepHours);
    const remSleepHours = toNumber(entry.remSleepHours);
    const deepSleepHours = toNumber(entry.deepSleepHours);
    const lightSleepHours = toNumber(entry.lightSleepHours);
    const awakeHours = toNumber(entry.awakeHours);
    const stageTotalHours = round1(remSleepHours + deepSleepHours + lightSleepHours + awakeHours);
    return {
      date: entry.date || todayIso(),
      bedtime: entry.bedtime || "",
      wakeTime: entry.wakeTime || "",
      totalSleepHours,
      sleepScore: clampNumber(entry.sleepScore, 0, 100),
      sleepQuality: clampNumber(entry.sleepQuality, 0, 5),
      remSleepHours,
      deepSleepHours,
      lightSleepHours,
      awakeHours,
      stageTotalHours,
      stageMismatchHours: totalSleepHours ? round1(stageTotalHours - totalSleepHours) : 0,
      hrvValue: toNumber(entry.hrvValue),
      hrvStatus: entry.hrvStatus || "unknown",
      restingHr: toNumber(entry.restingHr),
      restingHrDelta: toNumber(entry.restingHrDelta),
      bodyBatteryMorning: clampNumber(entry.bodyBatteryMorning, 0, 100),
      bodyBatteryEvening: clampNumber(entry.bodyBatteryEvening, 0, 100),
      stressLevel: entry.stressLevel || "unknown",
      energy: clampNumber(entry.energy, 0, 10),
      motivation: clampNumber(entry.motivation, 0, 10),
      backPain: clampNumber(entry.backPain, 0, 10),
      legSoreness: clampNumber(entry.legSoreness ?? entry.legFatigue, 0, 10),
      upperSoreness: clampNumber(entry.upperSoreness, 0, 10),
      notes: entry.notes || "",
      updatedAt: new Date().toISOString(),
    };
  }

  function normalizeDailyReport(entry) {
    return {
      date: entry.date || todayIso(),
      feltGood: entry.feltGood || "",
      feltBad: entry.feltBad || "",
      legs: entry.legs || "",
      back: entry.back || "",
      qualityVsExpected: entry.qualityVsExpected || "",
      planFollowed: entry.planFollowed || "partly",
      unsureAbout: entry.unsureAbout || "",
      coachQuestion: entry.coachQuestion || "",
      updatedAt: new Date().toISOString(),
    };
  }

  function saveDailyEnergy(entry) {
    const entries = readDailyEnergy();
    const next = normalizeDailyEnergy(entry);
    const index = entries.findIndex((item) => item.date === next.date);
    if (index >= 0) {
      entries[index] = next;
    } else {
      entries.push(next);
    }
    writeDailyEnergy(entries);
    return next;
  }

  function saveDailyStatus(entry) {
    const entries = readDailyStatuses();
    const next = normalizeDailyStatus(entry);
    const index = entries.findIndex((item) => item.date === next.date);
    if (index >= 0) {
      entries[index] = next;
    } else {
      entries.push(next);
    }
    writeDailyStatuses(entries);
    return next;
  }

  function saveDailyReport(entry) {
    const entries = readDailyReports();
    const next = normalizeDailyReport(entry);
    const index = entries.findIndex((item) => item.date === next.date);
    if (index >= 0) {
      entries[index] = next;
    } else {
      entries.push(next);
    }
    writeDailyReports(entries);
    return next;
  }

  function getDailyEnergyForDate(date) {
    return readDailyEnergy().find((entry) => entry.date === date) || normalizeDailyEnergy({ date });
  }

  function getDailyStatusForDate(date) {
    return readDailyStatuses().find((entry) => entry.date === date) || normalizeDailyStatus({ date });
  }

  function getDailyReportForDate(date) {
    return readDailyReports().find((entry) => entry.date === date) || normalizeDailyReport({ date });
  }

  function createBackup(extra) {
    return {
      app: "tkd-performance-log",
      schemaVersion: 3,
      exportedAt: new Date().toISOString(),
      sessions: readSessions(),
      dailyEnergy: readDailyEnergy(),
      dailyStatuses: readDailyStatuses(),
      dailyReports: readDailyReports(),
      extra: extra || {},
    };
  }

  function restoreBackup(backup) {
    if (!backup || typeof backup !== "object") {
      throw new Error("Backup-filen er ikke gyldig JSON.");
    }
    const sessions = Array.isArray(backup.sessions) ? backup.sessions : [];
    const dailyEnergy = Array.isArray(backup.dailyEnergy) ? backup.dailyEnergy : [];
    const dailyStatuses = Array.isArray(backup.dailyStatuses) ? backup.dailyStatuses : [];
    const dailyReports = Array.isArray(backup.dailyReports) ? backup.dailyReports : [];
    writeSessions(sessions);
    writeDailyEnergy(dailyEnergy);
    writeDailyStatuses(dailyStatuses);
    writeDailyReports(dailyReports);
    return {
      sessions: sessions.length,
      dailyEnergy: dailyEnergy.length,
      dailyStatuses: dailyStatuses.length,
      dailyReports: dailyReports.length,
      schemaVersion: backup.schemaVersion || "unknown",
      extra: backup.extra || {},
    };
  }

  function deleteSession(id) {
    const sessions = readSessions().filter((session) => session.id !== id);
    writeSessions(sessions);
  }

  function clearAll() {
    writeSessions([]);
    writeDailyEnergy([]);
    writeDailyStatuses([]);
    writeDailyReports([]);
  }

  function getSessionsBetween(daysBack, fromDate) {
    const end = startOfDay(fromDate || todayIso());
    const start = new Date(end);
    start.setDate(start.getDate() - Number(daysBack || 0) + 1);
    return readSessions().filter((session) => {
      const date = startOfDay(session.date);
      return date >= start && date <= end;
    });
  }

  function getSessionsForDate(date) {
    return readSessions()
      .filter((session) => session.date === date)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  function startOfDay(dateish) {
    const date = new Date(`${dateish}T00:00:00`);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function analyzeHistory(sessions, today) {
    const all = Array.isArray(sessions) ? sessions.map(normalizeSession) : readSessions();
    const last7 = sortByDateAscList(filterLastDays(all, 7, today));
    const last14 = sortByDateAscList(filterLastDays(all, 14, today));
    const last28 = sortByDateAscList(filterLastDays(all, 28, today));
    const thisWeek = sortByDateAscList(filterThisWeek(all, today));
    const byType7 = groupMinutesByType(last7);
    const byType28 = groupMinutesByType(last28);
    const weeklyHours = minutes(last7) / 60;
    const monthAvgHours = minutes(last28) / 60 / 4;
    const energy7 = analyzeEnergy(last7, 7, today);
    const dailyStatus7 = analyzeDailyStatus(7, today);
    const dailyStatus14 = analyzeDailyStatus(14, today);
    const dailyStatus30 = analyzeDailyStatus(30, today);

    return {
      last7,
      last14,
      last28,
      thisWeek,
      totalSessions: all.length,
      last7Hours: round1(weeklyHours),
      last14Hours: round1(minutes(last14) / 60),
      last28Hours: round1(minutes(last28) / 60),
      avgWeeklyHours28: round1(monthAvgHours),
      hardSessions7: last7.filter((session) => session.hard).length,
      hardDays7: countHardDays(last7),
      consecutiveHardDays: countConsecutiveHardDays(last7, today),
      strengthSessions7: countTypes(last7, ["strength", "upper_strength", "heavy_legs"]),
      tkdSessions7: countTypes(last7, tkdTypes),
      specificBikeSessions7: countTypes(last7, competitionConditioningTypes),
      tempoSessions7: countTypes(last7, ["tempo", "threshold"]),
      baseRecoveryMinutes7: round0(
        minutes(last7.filter((session) => baseRecoveryTypes.includes(session.type)))
      ),
      sparringQualityAvg28: average(
        last28.map((session) => session.sparringQuality).filter(Boolean)
      ),
      backPainAvg7: average(last7.map((session) => session.backPainAfter).filter(Boolean)),
      backPainTrend: trend(last28.map((session) => session.backPainAfter).filter(Boolean)),
      legFatigueAvg7: average(last7.map((session) => session.legFatigueAfter).filter(Boolean)),
      rpeTrendSpecific: trend(
        last28
          .filter((session) => competitionConditioningTypes.includes(session.type))
          .map((session) => session.rpe)
          .filter(Boolean)
      ),
      calories7: energy7,
      dailyStatus7,
      dailyStatus14,
      dailyStatus30,
      byType7,
      byType28,
      progressFlags: buildProgressFlags(last7, last28, weeklyHours, dailyStatus7),
      recommendations: buildHistoryRecommendations(last7, last28, weeklyHours, dailyStatus7),
    };
  }

  function filterLastDays(sessions, days, today) {
    const end = startOfDay(today || todayIso());
    const start = new Date(end);
    start.setDate(start.getDate() - days + 1);
    return sessions.filter((session) => {
      const date = startOfDay(session.date);
      return date >= start && date <= end;
    });
  }

  function filterThisWeek(sessions, today) {
    const end = startOfDay(today || todayIso());
    const start = new Date(end);
    const day = start.getDay() === 0 ? 7 : start.getDay();
    start.setDate(start.getDate() - day + 1);
    return sessions.filter((session) => {
      const date = startOfDay(session.date);
      return date >= start && date <= end;
    });
  }

  function analyzeEnergy(sessions, days, today) {
    const activeBurned = sessions.reduce((sum, session) => sum + session.activeCalories, 0);
    const dailyEntries = filterDailyLastDays(readDailyEnergy(), days, today);
    const restingBurned = dailyEntries.reduce((sum, entry) => sum + entry.restingCalories, 0);
    const consumed = dailyEntries.reduce((sum, entry) => sum + entry.caloriesConsumed, 0);
    const totalBurned = activeBurned + restingBurned;
    return {
      consumed,
      activeBurned,
      restingBurned,
      totalBurned,
      balance: consumed - totalBurned,
      daysLogged: dailyEntries.filter((entry) => entry.restingCalories || entry.caloriesConsumed).length,
      entries: dailyEntries,
      in: consumed,
      burned: totalBurned,
    };
  }

  function analyzeDailyStatus(days, today) {
    const entries = filterDailyLastDays(readDailyStatuses(), days, today);
    return {
      entries,
      daysLogged: entries.length,
      avgSleepHours: average(entries.map((entry) => entry.totalSleepHours).filter(Boolean)),
      avgSleepScore: average(entries.map((entry) => entry.sleepScore).filter(Boolean)),
      avgHrv: average(entries.map((entry) => entry.hrvValue).filter(Boolean)),
      avgRestingHr: average(entries.map((entry) => entry.restingHr).filter(Boolean)),
      avgBodyBatteryMorning: average(entries.map((entry) => entry.bodyBatteryMorning).filter(Boolean)),
      avgBackPain: average(entries.map((entry) => entry.backPain).filter(Boolean)),
      lowSleepDays: entries.filter((entry) => entry.totalSleepHours && entry.totalSleepHours < 7).length,
      lowSleepScoreDays: entries.filter((entry) => entry.sleepScore && entry.sleepScore < 60).length,
      lowHrvDays: entries.filter((entry) => ["low", "very_low", "unbalanced"].includes(entry.hrvStatus)).length,
      highStressDays: entries.filter((entry) => entry.stressLevel === "high").length,
      highBackPainDays: entries.filter((entry) => entry.backPain >= 4).length,
    };
  }

  function filterDailyLastDays(entries, days, today) {
    const end = startOfDay(today || todayIso());
    const start = new Date(end);
    start.setDate(start.getDate() - days + 1);
    return entries.filter((entry) => {
      const date = startOfDay(entry.date);
      return date >= start && date <= end;
    });
  }

  function minutes(sessions) {
    return sessions.reduce((sum, session) => sum + session.durationMin, 0);
  }

  function round0(value) {
    return Math.round(value || 0);
  }

  function round1(value) {
    return Math.round((value || 0) * 10) / 10;
  }

  function clampNumber(value, min, max) {
    const number = toNumber(value);
    if (!number) return 0;
    return Math.min(max, Math.max(min, number));
  }

  function average(values) {
    if (!values.length) return 0;
    return round1(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  function trend(values) {
    if (values.length < 4) return "unknown";
    const half = Math.floor(values.length / 2);
    const early = average(values.slice(0, half));
    const late = average(values.slice(half));
    if (late >= early + 0.7) return "rising";
    if (late <= early - 0.7) return "falling";
    return "stable";
  }

  function countTypes(sessions, types) {
    return sessions.filter((session) => types.includes(session.type)).length;
  }

  function countHardDays(sessions) {
    return new Set(sessions.filter((session) => session.hard).map((session) => session.date)).size;
  }

  function countConsecutiveHardDays(sessions, today) {
    const hardDays = new Set(sessions.filter((session) => session.hard).map((session) => session.date));
    let streak = 0;
    const cursor = startOfDay(today || todayIso());
    for (let index = 0; index < 7; index += 1) {
      const iso = formatDate(cursor);
      if (!hardDays.has(iso)) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function groupMinutesByType(sessions) {
    return sessions.reduce((acc, session) => {
      const label = sessionTypes[session.type] || session.type;
      acc[label] = round1(((acc[label] || 0) * 60 + session.durationMin) / 60);
      return acc;
    }, {});
  }

  function buildProgressFlags(last7, last28, weeklyHours, dailyStatus7) {
    const flags = [];
    const hard7 = last7.filter((session) => session.hard).length;
    const sparringQuality = average(
      last28.map((session) => session.sparringQuality).filter(Boolean)
    );
    const backTrend = trend(last28.map((session) => session.backPainAfter).filter(Boolean));
    const rpeSpecific = trend(
      last28
        .filter((session) => competitionConditioningTypes.includes(session.type))
        .map((session) => session.rpe)
        .filter(Boolean)
    );

    if (weeklyHours >= 20 && hard7 <= 3) {
      flags.push("20+ timer er mulig akkurat na fordi hard belastning fortsatt er kontrollert.");
    } else if (weeklyHours >= 20) {
      flags.push("20+ timer med for mye hardt er ikke optimal trening. Det er risikostyring som mangler.");
    } else if (weeklyHours >= 16) {
      flags.push("Du ligger nar 20 timer. Neste okning ma komme fra base, teknikk eller recovery, ikke mer maks.");
    }
    if (sparringQuality >= 4) {
      flags.push("Sparringskvalitet holder seg hoy. Det er et bedre signal enn kalorier.");
    }
    if (backTrend === "rising") {
      flags.push("Ryggtrend stiger. Kutt aksial belastning og aggressiv rotasjon for den bestemmer planen.");
    }
    if (rpeSpecific === "falling") {
      flags.push("RPE pa spesifikke intervaller faller. Du kan snart oke ett drag eller litt intensitet, ikke begge.");
    } else if (rpeSpecific === "rising") {
      flags.push("RPE pa spesifikke intervaller stiger. Hold eller reduser volum.");
    }
    if (dailyStatus7?.lowSleepScoreDays >= 2) {
      flags.push("Søvnscore er lav flere dager. Recovery-data peker ikke mot mer hardhet.");
    }
    if (dailyStatus7?.lowHrvDays >= 2) {
      flags.push("HRV er svak/ubalansert flere dager. Neste harde økt må fortjenes av bedre signaler.");
    }
    if (dailyStatus7?.highStressDays >= 2) {
      flags.push("Stress er høyt flere dager. Ikke fyll uka med ekstra hard kondisjon.");
    }
    return flags;
  }

  function buildHistoryRecommendations(last7, last28, weeklyHours, dailyStatus7) {
    const recommendations = [];
    const hard7 = last7.filter((session) => session.hard).length;
    const strength7 = countTypes(last7, ["strength", "upper_strength", "heavy_legs"]);
    const baseMinutes7 = minutes(
      last7.filter((session) => baseRecoveryTypes.includes(session.type))
    );
    const specific7 = countTypes(last7, competitionConditioningTypes);
    const tempo7 = countTypes(last7, ["tempo", "threshold"]);
    const backTrend = trend(last28.map((session) => session.backPainAfter).filter(Boolean));

    if (hard7 > 3) {
      recommendations.push("Kutt en hard okt. Du trenger bedre fordeling, ikke mer vilje.");
    }
    if (tempo7 > 1) {
      recommendations.push("Du har mer enn en terskel/lang hoypuls-okt. Det er hard belastning, ikke base.");
    }
    if (specific7 < 1) {
      recommendations.push("Legg inn en konkurransespesifikk sykkelokt hvis readiness er gronn.");
    }
    if (strength7 < 2) {
      recommendations.push("Legg inn styrke, men ikke dagen for viktig sparring.");
    }
    if (baseMinutes7 < 90 && weeklyHours < 20) {
      recommendations.push("Hvis du skal mot 20 timer, fyll pa med rolig base/recovery forst.");
    }
    if (backTrend === "rising") {
      recommendations.push("Ryggtrend gar feil vei. Deload aksial belastning og rotasjon.");
    }
    if (dailyStatus7?.avgSleepScore && dailyStatus7.avgSleepScore < 70) {
      recommendations.push("Søvnscore snitt er lav. Legg hardøkter etter bedre søvn, ikke etter motivasjon.");
    }
    if (dailyStatus7?.avgBodyBatteryMorning && dailyStatus7.avgBodyBatteryMorning < 50) {
      recommendations.push("Body Battery snitt er lav. Mer volum må være lett base, teknikk eller recovery.");
    }
    if (!recommendations.length) {
      recommendations.push("Hold strukturen. Oking skal skje kontrollert, ikke fordi du foler deg motivert.");
    }
    return recommendations;
  }

  function createAiPayload(context) {
    const sessions = readSessions();
    const analysis = analyzeHistory(sessions);
    return {
      athlete: {
        sport: "Junior ITF Taekwon-Do sparring",
        goals: ["NM-gull", "EM-medalje", "senere EM-/VM-gull"],
        volumeToleranceNote:
          "Utovaren er vant med hoy treningsmengde, opptil rundt 20 timer per uke, men kvalitet og rygg styrer okning.",
      },
      context,
      history: analysis,
      recentSessions: analysis.last28,
      dailyEnergy: analysis.calories7.entries,
      dailyStatuses: analysis.dailyStatus30.entries,
      safetyRules: [
        "Rygg 5+/10: ingen hard kondisjon, tung styrke eller aggressiv TKD-rotasjon.",
        "Ikke mer enn 2 harde dager pa rad.",
        "Normalt maks 3 harde hovedokter per 7 dager.",
        "Ikke tung beinokt dagen for viktig sparring.",
        "20+ timer er bare akseptabelt nar mesteparten er teknikk, base, recovery, prehab eller taktikk.",
        "Optimaliser for sparringsprestasjon, ikke kalorier eller Garmin-score.",
      ],
      task:
        "Analyser monsteret og foresla justeringer mot optimal sparringsprestasjon. Ikke foresla noe som bryter safetyRules.",
    };
  }

  return {
    STORAGE_KEY,
    DAILY_ENERGY_KEY,
    DAILY_STATUS_KEY,
    sessionTypes,
    todayIso,
    readSessions,
    writeSessions,
    readDailyEnergy,
    writeDailyEnergy,
    readDailyStatuses,
    writeDailyStatuses,
    readDailyReports,
    writeDailyReports,
    saveSession,
    saveDailyEnergy,
    saveDailyStatus,
    saveDailyReport,
    getDailyEnergyForDate,
    getDailyStatusForDate,
    getDailyReportForDate,
    createBackup,
    restoreBackup,
    deleteSession,
    clearAll,
    getSessionsBetween,
    getSessionsForDate,
    analyzeHistory,
    createAiPayload,
  };
});
