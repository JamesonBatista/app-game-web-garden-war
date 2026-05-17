const BEST_RUN_KEY = "survivorsQuest.bestRun.v1";

function isStorageAvailable() {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

export function computeRunScore(summary) {
  const timeScore = summary.survivalSeconds * 4;
  const combatScore = summary.kills * 8 + summary.damageDealt * 0.18;
  const eliteScore = summary.elitesKilled * 120 + summary.bossesKilled * 420;
  const levelScore = summary.level * 65 + summary.power * 0.9;
  const masteryScore = (summary.highestHit ?? 0) * 0.5 + (summary.lootEquipped ?? 0) * 14 + (summary.crits ?? 0) * 3;
  return Math.max(0, Math.round(timeScore + combatScore + eliteScore + levelScore + masteryScore));
}

export function loadBestRun() {
  if (!isStorageAvailable()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(BEST_RUN_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveBestRunIfNeeded(summary) {
  if (!isStorageAvailable()) {
    return { bestRun: null, isNewBest: false };
  }

  const score = computeRunScore(summary);
  const next = {
    ...summary,
    score,
    savedAt: new Date().toISOString()
  };
  const current = loadBestRun();
  const shouldReplace = !current || score > (current.score ?? 0);
  if (shouldReplace) {
    window.localStorage.setItem(BEST_RUN_KEY, JSON.stringify(next));
    return { bestRun: next, isNewBest: true };
  }
  return { bestRun: current, isNewBest: false };
}
