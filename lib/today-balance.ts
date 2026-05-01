/** Aggregated macros for “today” tracking (not medical advice). */

export type DayMacroTotals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sodium_mg: number;
};

export type MacroScanRow = {
  created_at: string;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  sodium_mg: number | null;
};

export const EMPTY_DAY_TOTALS: DayMacroTotals = {
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  sodium_mg: 0,
};

export function localDayStartISO(now = new Date()): string {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).toISOString();
}

export function isScanCreatedLocalToday(
  createdAtIso: string,
  now = new Date()
): boolean {
  const d = new Date(createdAtIso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function sumScanMacroRows(
  rows: Array<{
    calories: number | null;
    protein_g: number | null;
    fat_g: number | null;
    carbs_g: number | null;
    sodium_mg: number | null;
  }>
): DayMacroTotals {
  return rows.reduce<DayMacroTotals>(
    (acc, r) => ({
      calories: acc.calories + (r.calories ?? 0),
      protein_g: acc.protein_g + (r.protein_g ?? 0),
      carbs_g: acc.carbs_g + (r.carbs_g ?? 0),
      fat_g: acc.fat_g + (r.fat_g ?? 0),
      sodium_mg: acc.sodium_mg + (r.sodium_mg ?? 0),
    }),
    { ...EMPTY_DAY_TOTALS }
  );
}

export function sumMacrosForLocalTodayFromScans(
  scans: MacroScanRow[]
): DayMacroTotals {
  return sumScanMacroRows(
    scans.filter((s) => isScanCreatedLocalToday(s.created_at))
  );
}

/**
 * One short rule-based sentence for the day so far.
 */
export function getTodayBalancePatternSentence(t: DayMacroTotals): string {
  const cal = t.calories;
  const p = t.protein_g;
  const c = t.carbs_g;
  const f = t.fat_g;
  const na = t.sodium_mg;

  if (cal < 1 && p < 1 && c < 1 && f < 1) {
    return "Log a scan to start tracking your day!";
  }

  const hasSodiumSignal = na >= 1;
  const sodiumHigh = hasSodiumSignal && na >= 2300;
  const sodiumBit = hasSodiumSignal && na >= 1500 && na < 2300;
  const proteinGood = p >= 58;
  const proteinTrack = p >= 40 && p < 58;
  const proteinLow = cal >= 650 && p < 36;
  const carbsHigh = cal >= 1100 && c >= 175;
  const fatHigh = cal >= 1000 && f >= 58;

  const lead =
    proteinGood
      ? "Good protein intake"
      : proteinTrack
        ? "Protein is on track"
        : proteinLow
          ? "Protein is on the low side today"
          : null;

  const tail =
    sodiumHigh
      ? "sodium is relatively high today"
      : sodiumBit
        ? "sodium is a bit high"
        : carbsHigh
          ? "carbs are relatively high today"
          : fatHigh
            ? "fat is on the high side today"
            : null;

  if (lead && tail) {
    return `${lead}, but ${tail}.`;
  }
  if (lead) {
    return `${lead}.`;
  }
  if (tail) {
    const s = tail.charAt(0).toUpperCase() + tail.slice(1);
    return `${s}.`;
  }
  if (cal >= 1800) {
    return "Calories are piling up. Balance the rest of the day if you want to cut weight.";
  }
  if (cal >= 400 && cal < 900) {
    return "You have made good progress to get necessary fuel for the day. Keep going.";
  }
  return "Your macros look OK so far, keep eating and tracking to get better feedback.";
}
