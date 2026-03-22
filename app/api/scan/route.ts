import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const COLAB_INFERENCE_URL = process.env.COLAB_INFERENCE_URL;
const EDAMAM_APP_ID = process.env.EDAMAM_APP_ID;
const EDAMAM_APP_KEY = process.env.EDAMAM_APP_KEY;

// Edamam nutrients are per 100g. Keys from Food Database API.
const NUTRIENT_KEYS = {
  calories: "ENERC_KCAL",
  protein_g: "PROCNT",
  fat_g: "FAT",
  saturated_fat_g: "FASAT",
  carbs_g: "CHOCDF",
  sugar_g: "SUGAR",
  sodium_mg: "NA",
  fiber_g: "FIBTG",
} as const;

type EdamamNutrients = Record<string, number>;

// Severity maps to PRD badge colors: red, orange, yellow
type FlagSeverity = "red" | "orange" | "yellow";

export type HealthFlag = {
  type: string;
  severity: FlagSeverity;
  message: string;
};

// Known harmful additives to flag (case-insensitive match against ingredients)
const TOXIC_ADDITIVES = [
  "Red 40",
  "Red 40 Lake",
  "Allura Red",
  "BHA",
  "BHT",
  "TBHQ",
  "tert-Butylhydroquinone",
  "Yellow 5",
  "Yellow 6",
  "Blue 1",
  "Blue 2",
  "Sodium Benzoate",
  "Potassium Benzoate",
  "Sodium Nitrite",
  "Sodium Nitrate",
  "Carrageenan",
  "Propyl Gallate",
  "Polysorbate 80",
  "Sodium Tripolyphosphate",
  "MSG",
  "monosodium glutamate",
];

// Edamam caution values that indicate allergens (PRD: nuts, gluten, dairy, soy, shellfish, eggs)
const ALLERGEN_CAUTIONS = [
  "PEANUTS",
  "TREE_NUTS",
  "GLUTEN",
  "WHEAT",
  "MILK",
  "EGGS",
  "SOY",
  "FISH",
  "SHELLFISH",
  "LUPINE",
  "MUSTARD",
  "SESAME",
  "CELERY",
  "SULFITES",
  "FODMAP",
  "MOLLUSK",
  "CRUSTACEAN",
];

// Cautions that imply animal products (Not Vegan)
const ANIMAL_CAUTIONS = ["MILK", "EGGS", "FISH", "SHELLFISH", "MOLLUSK", "CRUSTACEAN"];

// Ingredient terms that indicate animal products (Not Vegan)
const ANIMAL_INGREDIENT_TERMS = [
  "milk",
  "egg",
  "cheese",
  "butter",
  "cream",
  "yogurt",
  "whey",
  "gelatin",
  "honey",
  "beef",
  "chicken",
  "pork",
  "fish",
  "shrimp",
  "lard",
  "bacon",
];

// Terms suggesting pork or alcohol (Not Halal)
const HALAL_CONCERN_TERMS = [
  "pork",
  "bacon",
  "ham",
  "lard",
  "gelatin",
  "alcohol",
  "wine",
  "beer",
  "whiskey",
  "ethanol",
  "rum",
];

function buildFlags(params: {
  nutrition: {
    sugar_g: number;
    sodium_mg: number;
    saturated_fat_g: number;
  } | null;
  healthLabels: string[];
  cautions: string[];
  ingredientsText: string;
}): HealthFlag[] {
  const flags: HealthFlag[] = [];
  const { nutrition, healthLabels, cautions, ingredientsText } = params;
  const ingredientsLower = ingredientsText.toLowerCase();

  // 1. Allergen (red) — from Edamam cautions
  const allergenCautions = cautions.filter((c) =>
    ALLERGEN_CAUTIONS.some((a) => String(c).toUpperCase().includes(a))
  );
  if (allergenCautions.length > 0) {
    flags.push({
      type: "allergen",
      severity: "red",
      message: `May contain: ${[...new Set(allergenCautions)].join(", ")}`,
    });
  }

  // 2. Nutrition thresholds (orange)
  if (nutrition) {
    if (nutrition.sugar_g > 12) {
      flags.push({
        type: "high_sugar",
        severity: "orange",
        message: `High sugar: ${nutrition.sugar_g}g per serving (limit 12g)`,
      });
    }
    if (nutrition.sodium_mg > 600) {
      flags.push({
        type: "high_sodium",
        severity: "orange",
        message: `High sodium: ${nutrition.sodium_mg}mg per serving (limit 600mg)`,
      });
    }
    if (nutrition.saturated_fat_g > 5) {
      flags.push({
        type: "high_saturated_fat",
        severity: "orange",
        message: `High saturated fat: ${nutrition.saturated_fat_g}g per serving (limit 5g)`,
      });
    }
  }

  // 3. Toxic/Additive (red) — cross-reference ingredients
  for (const additive of TOXIC_ADDITIVES) {
    if (ingredientsLower.includes(additive.toLowerCase())) {
      flags.push({
        type: "toxic_additive",
        severity: "red",
        message: `Contains ${additive}, which may have health concerns`,
      });
      break; // One flag per product
    }
  }

  // 4. Not Vegan (yellow) — animal products from cautions or ingredients
  const hasVeganLabel = healthLabels.some((h) => String(h).toUpperCase() === "VEGAN");
  const hasAnimalCaution = cautions.some((c) =>
    ANIMAL_CAUTIONS.some((a) => String(c).toUpperCase().includes(a))
  );
  const hasAnimalIngredient = ANIMAL_INGREDIENT_TERMS.some((term) =>
    ingredientsLower.includes(term)
  );
  if (!hasVeganLabel && (hasAnimalCaution || hasAnimalIngredient)) {
    flags.push({
      type: "not_vegan",
      severity: "yellow",
      message: "Contains animal-derived ingredients",
    });
  }

  // 5. Not Halal (yellow) — pork or alcohol
  const hasHalalConcern = HALAL_CONCERN_TERMS.some((term) =>
    ingredientsLower.includes(term)
  );
  if (hasHalalConcern) {
    flags.push({
      type: "not_halal",
      severity: "yellow",
      message: "May contain pork or alcohol derivatives",
    });
  }

  return flags;
}

function extractNutrition(
  nutrients: EdamamNutrients | undefined,
  servingGrams: number
): Record<string, number> | null {
  if (!nutrients || typeof nutrients !== "object") return null;
  const scale = servingGrams / 100;
  const out: Record<string, number> = {};
  for (const [key, edamamKey] of Object.entries(NUTRIENT_KEYS)) {
    const val = nutrients[edamamKey];
    if (typeof val === "number") {
      out[key] = Math.round(val * scale * 100) / 100;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

export async function POST(request: Request) {
  try {
    // Require authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be signed in to scan food." },
        { status: 401 }
      );
    }

    if (!COLAB_INFERENCE_URL) {
      return NextResponse.json(
        {
          error: "COLAB_INFERENCE_URL is not configured. Start the Colab runtime and ngrok before scanning.",
        },
        { status: 503 }
      );
    }

    const body = await request.json();

    if (!body || typeof body.image !== "string") {
      return NextResponse.json(
        { error: "Request body must include a base64-encoded image: { image: string }" },
        { status: 400 }
      );
    }

    const colabResponse = await fetch(`${COLAB_INFERENCE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: body.image }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!colabResponse.ok) {
      const text = await colabResponse.text();
      console.error(
        `Colab inference error ${colabResponse.status}:`,
        text.slice(0, 500)
      );
      return NextResponse.json(
        {
          error: "ML inference endpoint failed. Ensure Colab runtime and ngrok are running.",
          details: colabResponse.status === 502 ? "Endpoint may be down or unreachable" : undefined,
        },
        { status: 502 }
      );
    }

    const result = await colabResponse.json();

    if (!result || typeof result.label !== "string") {
      return NextResponse.json(
        { error: "Invalid response from ML inference endpoint" },
        { status: 502 }
      );
    }

    const label = result.label;
    const confidence = typeof result.confidence === "number" ? result.confidence : 0;
    const top5 = Array.isArray(result.top5) ? result.top5 : [];

    // Edamam nutrition lookup (optional — ML result returned even if Edamam fails)
    let nutrition: {
      calories: number;
      protein_g: number;
      fat_g: number;
      saturated_fat_g: number;
      carbs_g: number;
      sugar_g: number;
      sodium_mg: number;
      fiber_g: number;
      serving_grams: number;
      serving_label: string;
    } | null = null;
    let healthLabels: string[] = [];
    let cautions: string[] = [];
    let ingredientsText = "";

    if (EDAMAM_APP_ID && EDAMAM_APP_KEY) {
      const parserUrl = new URL(
        "https://api.edamam.com/api/food-database/v2/parser"
      );
      parserUrl.searchParams.set("ingr", label);
      parserUrl.searchParams.set("app_id", EDAMAM_APP_ID);
      parserUrl.searchParams.set("app_key", EDAMAM_APP_KEY);

      try {
        const edamamRes = await fetch(parserUrl.toString(), {
          signal: AbortSignal.timeout(5_000),
        });

        if (edamamRes.ok) {
          const data = await edamamRes.json();
          const hint = data?.hints?.[0];
          const food = hint?.food;

          if (food?.nutrients) {
            const measure = hint?.measures?.[0];
            const servingGrams = measure?.weight ?? 100;
            const servingLabel = measure?.label ?? "100g";

            const extracted = extractNutrition(
              food.nutrients,
              servingGrams
            );

            if (extracted) {
              nutrition = {
                calories: extracted.calories ?? 0,
                protein_g: extracted.protein_g ?? 0,
                fat_g: extracted.fat_g ?? 0,
                saturated_fat_g: extracted.saturated_fat_g ?? 0,
                carbs_g: extracted.carbs_g ?? 0,
                sugar_g: extracted.sugar_g ?? 0,
                sodium_mg: extracted.sodium_mg ?? 0,
                fiber_g: extracted.fiber_g ?? 0,
                serving_grams: servingGrams,
                serving_label: servingLabel,
              };
              healthLabels = Array.isArray(food.healthLabels)
                ? food.healthLabels
                : [];
              cautions = Array.isArray(food.cautions) ? food.cautions : [];
              ingredientsText =
                typeof food.foodContentsLabel === "string"
                  ? food.foodContentsLabel
                  : "";
            }
          }
        }
      } catch (edamamErr) {
        console.warn("Edamam lookup failed:", edamamErr);
      }
    }

    const flags = buildFlags({
      nutrition: nutrition
        ? {
            sugar_g: nutrition.sugar_g,
            sodium_mg: nutrition.sodium_mg,
            saturated_fat_g: nutrition.saturated_fat_g,
          }
        : null,
      healthLabels,
      cautions,
      ingredientsText,
    });

    // Save scan to Supabase
    let scanId: string | null = null;
    try {
      const admin = createAdminClient();
      const { data: insertData, error: insertError } = await admin
        .from("scans")
        .insert({
          user_id: user.id,
          food_label: label,
          scan_mode: "image",
          confidence,
          calories: nutrition?.calories ?? null,
          protein_g: nutrition?.protein_g ?? null,
          fat_g: nutrition?.fat_g ?? null,
          carbs_g: nutrition?.carbs_g ?? null,
          sodium_mg: nutrition?.sodium_mg ?? null,
          sugar_g: nutrition?.sugar_g ?? null,
          flags,
        })
        .select("id")
        .single();
      if (!insertError && insertData) {
        scanId = insertData.id;
      } else if (insertError) {
        console.warn("Failed to save scan:", insertError.message);
      }
    } catch (dbErr) {
      console.warn("Failed to save scan:", dbErr);
    }

    return NextResponse.json({
      id: scanId,
      label,
      confidence,
      top5,
      nutrition,
      flags,
    });
  } catch (err) {
    const isTimeout =
      err instanceof Error && err.name === "AbortError";

    if (isTimeout) {
      return NextResponse.json(
        { error: "ML inference timed out. Try again or use a smaller image." },
        { status: 504 }
      );
    }

    console.error("Scan API error:", err);
    return NextResponse.json(
      { error: "Scan failed. Please try again." },
      { status: 500 }
    );
  }
}
