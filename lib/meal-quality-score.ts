/**
 * Simple 0–100 rule-based score from macros (not medical advice).
 * Optional fields skipped when null/undefined (neutral for that factor).
 */

export type MealQualityInput = {
  calories: number;
  protein_g: number;
  fat_g: number;
  sugar_g: number;
  sodium_mg: number;
  saturated_fat_g?: number | null;
  fiber_g?: number | null;
};

export function getMealQualityScore(
  input: MealQualityInput | null | undefined
): number | null {
  if (!input || input.calories <= 0) return null;

  const {
    calories: cal,
    protein_g: p,
    fat_g: fat,
    sugar_g: sugar,
    sodium_mg: na,
    saturated_fat_g: sat,
    fiber_g: fib,
  } = input;

  let score = 58;

  if (p >= 30) score += 20;
  else if (p >= 22) score += 16;
  else if (p >= 15) score += 12;
  else if (p >= 10) score += 7;
  else if (p >= 6) score += 3;
  else score -= 6;

  if (fib != null && fib > 0) {
    if (fib >= 8) score += 12;
    else if (fib >= 5) score += 9;
    else if (fib >= 3) score += 5;
    else score += 2;
  }

  if (sugar >= 35) score -= 18;
  else if (sugar >= 22) score -= 13;
  else if (sugar >= 14) score -= 9;
  else if (sugar >= 10) score -= 5;
  else if (sugar >= 6) score -= 2;

  if (na >= 1400) score -= 16;
  else if (na >= 1000) score -= 11;
  else if (na >= 700) score -= 7;
  else if (na >= 500) score -= 3;

  if (sat != null && sat > 0) {
    if (sat >= 16) score -= 12;
    else if (sat >= 11) score -= 8;
    else if (sat >= 7) score -= 5;
    else if (sat >= 4) score -= 2;
  }

  if (fat >= 48) score -= 9;
  else if (fat >= 38) score -= 6;
  else if (fat >= 28) score -= 3;

  if (cal >= 950) score -= 8;
  else if (cal >= 800) score -= 4;
  if (cal >= 350 && cal <= 720 && p >= 14) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}
