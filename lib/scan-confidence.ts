/**
 * Maps model confidence + food "complexity" to a simple High / Medium / Low label for UX.
 * Complex dishes (mixed plates) use stricter thresholds because photos vary more.
 */

export type ConfidenceTier = "high" | "medium" | "low";

const COMPLEX_LABELS = new Set([
  "lasagna",
  "nachos",
  "fried_rice",
  "pad_thai",
  "ramen",
  "tacos",
  "pizza",
  "hamburger",
  "hot_dog",
  "caesar_salad",
  "omelette",
  "sushi",
]);

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "_");
}

export function isComplexFood(label: string): boolean {
  return COMPLEX_LABELS.has(normalizeLabel(label));
}

export function getScanConfidencePresentation(
  foodLabel: string,
  modelConfidence: number
): {
  tier: ConfidenceTier;
  tierLabel: string;
  explanation: string;
} {
  const c = Math.min(1, Math.max(0, modelConfidence));
  const complex = isComplexFood(foodLabel);

  const highCut = complex ? 0.78 : 0.68;
  const medCut = complex ? 0.48 : 0.42;

  let tier: ConfidenceTier;
  if (c >= highCut) tier = "high";
  else if (c >= medCut) tier = "medium";
  else tier = "low";

  const tierLabel =
    tier === "high" ? "High" : tier === "medium" ? "Medium" : "Low";

  let explanation: string;
  if (tier === "low") {
    explanation = "Uncertain match—try a clearer photo.";
  } else if (tier === "medium") {
    explanation = "Portion size may affect this estimate.";
  } else if (complex) {
    explanation =
      "Strong signal; mixed dishes still vary by what’s on the plate.";
  } else {
    explanation = "Likely match for this type of food.";
  }

  return { tier, tierLabel, explanation };
}
