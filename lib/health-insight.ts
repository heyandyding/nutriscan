/**
 * Friendly, non-medical blurbs from nutrition numbers (rule-based, not a diagnosis).
 * Pass per-serving values (e.g. after serving multiplier on the scan page).
 */

export type HealthInsightInput = {
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  sugar_g: number;
  sodium_mg: number;
  /** Omit when unknown (e.g. saved scans without fiber in DB). */
  fiber_g?: number | null;
};

export function getHealthInsight(
  input: HealthInsightInput | null | undefined
): string | null {
  if (!input || input.calories <= 0) return null;

  const cal = input.calories;
  const p = input.protein_g;
  const fat = input.fat_g;
  const carb = input.carbs_g;
  const sugar = input.sugar_g;
  const na = input.sodium_mg;
  const fib = input.fiber_g;

  const lines: string[] = [];

  if (na >= 700) {
    lines.push(
      "This serving looks fairly salty on the label, so it may taste more seasoned than plainer foods."
    );
  }

  if (sugar >= 12) {
    lines.push(
      "Sugar plays a noticeable role here, so the flavor may lean sweet."
    );
  }

  if (fib != null && fib >= 5) {
    lines.push(
      "Fiber is a nice bump for this portion compared with many snacky picks."
    );
  } else if (fib != null && fib >= 3 && fib < 5) {
    lines.push("There’s a bit of fiber here—not huge, but not zero either.");
  }

  if (lines.length < 2 && p >= 18 && cal < 800) {
    lines.push(
      "Protein is doing meaningful work in this serving, which can feel satisfying."
    );
  }

  if (lines.length < 2 && cal >= 700) {
    lines.push(
      "Calories are on the hearty side for one plate—handy when you want something filling."
    );
  } else if (lines.length < 2 && cal > 0 && cal <= 220) {
    lines.push(
      "This is a lighter calorie portion; pairing it with sides is easy if you want more volume."
    );
  }

  if (lines.length < 2 && fat >= 28) {
    lines.push(
      "Fat is fairly high for this amount of food, so expect a richer texture."
    );
  }

  if (lines.length < 2 && carb >= 45 && p < 12) {
    lines.push(
      "Carbs lead the numbers here more than protein—common for bowls, breads, and noodles."
    );
  }

  if (lines.length === 0) {
    return "For this serving, nothing jumps out as extreme—just a snapshot to pair with how you like to eat.";
  }

  return lines.slice(0, 2).join(" ");
}
