import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PatchBody = {
  food_label?: string;
  portion_multiplier?: number;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid scan id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const food_label =
    typeof body.food_label === "string" ? body.food_label.trim() : "";
  const portion =
    typeof body.portion_multiplier === "number" &&
    Number.isFinite(body.portion_multiplier)
      ? body.portion_multiplier
      : NaN;
  const calories =
    typeof body.calories === "number" && Number.isFinite(body.calories)
      ? body.calories
      : NaN;
  const protein_g =
    typeof body.protein_g === "number" && Number.isFinite(body.protein_g)
      ? body.protein_g
      : NaN;
  const carbs_g =
    typeof body.carbs_g === "number" && Number.isFinite(body.carbs_g)
      ? body.carbs_g
      : NaN;
  const fat_g =
    typeof body.fat_g === "number" && Number.isFinite(body.fat_g)
      ? body.fat_g
      : NaN;

  if (!food_label) {
    return NextResponse.json(
      { error: "Food name is required" },
      { status: 400 }
    );
  }
  if (portion < 0.25 || portion > 50) {
    return NextResponse.json(
      { error: "Portion must be between 0.25 and 50 servings" },
      { status: 400 }
    );
  }
  if (calories < 0 || calories > 20000) {
    return NextResponse.json(
      { error: "Calories out of range" },
      { status: 400 }
    );
  }
  if (protein_g < 0 || protein_g > 2000 || carbs_g < 0 || carbs_g > 2000 || fat_g < 0 || fat_g > 2000) {
    return NextResponse.json(
      { error: "Macros out of range" },
      { status: 400 }
    );
  }

  const { data: existing, error: fetchError } = await supabase
    .from("scans")
    .select("calories, sugar_g, sodium_mg")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  const prevCal =
    typeof existing.calories === "number" && existing.calories > 0
      ? existing.calories
      : 0;
  const ratio =
    prevCal > 0 && calories > 0 ? calories / prevCal : 1;

  const sugar_g =
    existing.sugar_g != null && typeof existing.sugar_g === "number"
      ? round2(existing.sugar_g * ratio)
      : null;
  const sodium_mg =
    existing.sodium_mg != null && typeof existing.sodium_mg === "number"
      ? round2(existing.sodium_mg * ratio)
      : null;

  const { error: updateError } = await supabase
    .from("scans")
    .update({
      food_label,
      portion_multiplier: round2(portion),
      calories: round2(calories),
      protein_g: round2(protein_g),
      fat_g: round2(fat_g),
      carbs_g: round2(carbs_g),
      sugar_g,
      sodium_mg,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Scan update failed:", updateError.message);
    return NextResponse.json(
      { error: "Could not save changes" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
