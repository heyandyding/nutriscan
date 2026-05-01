"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/spinner";
import { ThemeToggle } from "@/components/theme-toggle";
import { TodaysBalanceCard } from "@/components/todays-balance-card";
import { getScanConfidencePresentation } from "@/lib/scan-confidence";
import { getHealthInsight } from "@/lib/health-insight";
import { getMealQualityScore } from "@/lib/meal-quality-score";
import { FoodScanOptions } from "@/components/food-scan-options";
import { EditScanResult } from "@/components/edit-scan-result";
import {
  EMPTY_DAY_TOTALS,
  localDayStartISO,
  sumScanMacroRows,
  type DayMacroTotals,
} from "@/lib/today-balance";

type ScanResult = {
  id?: string | null;
  label: string;
  confidence: number;
  top5: unknown[];
  nutrition: {
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
  } | null;
  flags: Array<{
    type: string;
    severity: "red" | "orange" | "yellow";
    message: string;
  }>;
};

type ScanState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: ScanResult; previewUrl?: string }
  | { status: "error"; message: string };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const FLAG_COLORS = {
  red: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40",
  orange:
    "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40",
  yellow:
    "bg-yellow-500/15 text-yellow-800 dark:text-yellow-200 border-yellow-500/40",
} as const;

const TIER_BADGE = {
  high: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-200 border-emerald-500/20",
  medium: "bg-muted/80 text-muted-foreground border-border",
  low: "bg-amber-500/10 text-amber-900 dark:text-amber-100 border-amber-500/20",
} as const;

const SERVING_STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export default function ScanPage() {
  const [state, setState] = useState<ScanState>({ status: "idle" });
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [todayTotals, setTodayTotals] =
    useState<DayMacroTotals>(EMPTY_DAY_TOTALS);
  const [todayLoading, setTodayLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshTodayTotals = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setTodayTotals(EMPTY_DAY_TOTALS);
      setTodayLoading(false);
      return;
    }
    setTodayLoading(true);
    const { data, error } = await supabase
      .from("scans")
      .select("calories, protein_g, fat_g, carbs_g, sodium_mg")
      .eq("user_id", user.id)
      .gte("created_at", localDayStartISO());
    setTodayLoading(false);
    if (error || !data) {
      setTodayTotals(EMPTY_DAY_TOTALS);
      return;
    }
    setTodayTotals(sumScanMacroRows(data));
  }, []);

  useEffect(() => {
    void refreshTodayTotals();
  }, [refreshTodayTotals]);

  const savedScanId =
    state.status === "success" && state.result.id ? state.result.id : null;

  useEffect(() => {
    if (savedScanId) {
      void refreshTodayTotals();
    }
  }, [savedScanId, refreshTodayTotals]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setState({ status: "loading" });
    const previewUrl = URL.createObjectURL(file);

    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState({
          status: "error",
          message: data.error ?? "Scan failed. Please try again.",
        });
        URL.revokeObjectURL(previewUrl);
        return;
      }

      setState({
        status: "success",
        result: data,
        previewUrl,
      });
      setServingMultiplier(1);
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof Error ? err.message : "Network error. Please try again.",
      });
      URL.revokeObjectURL(previewUrl);
    } finally {
      e.target.value = "";
    }
  }

  function handleReset() {
    if (state.status === "success" && state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
    }
    setState({ status: "idle" });
    setServingMultiplier(1);
  }

  const confidencePres =
    state.status === "success"
      ? getScanConfidencePresentation(
          state.result.label,
          state.result.confidence
        )
      : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground text-sm font-medium"
          >
            ← Back
          </Link>
          <h1 className="text-lg font-semibold text-foreground">
            NutriScan
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href="/history"
              className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              History
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:items-start">
          <div className="flex flex-col gap-6 min-w-0">
            <TodaysBalanceCard
              totals={todayTotals}
              loading={todayLoading}
            />
            <FoodScanOptions />
          </div>

          <div className="flex flex-col gap-6 min-w-0">
            {/* Upload area */}
            <section className="rounded-2xl border-2 border-dashed border-input bg-card p-8 text-center transition-colors hover:border-primary/50">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Upload or capture food photo"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={state.status === "loading"}
                className="w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {state.status === "loading" ? (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <Spinner className="w-12 h-12" />
                    <p className="text-muted-foreground font-medium">
                      Analyzing…
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Identifying food and fetching nutrition
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                      <svg
                        className="w-7 h-7 text-emerald-600 dark:text-emerald-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h7"
                        />
                      </svg>
                    </div>
                    <p className="text-foreground font-semibold">
                      Upload or take a photo
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Point your camera at a single food item
                    </p>
                  </div>
                )}
              </button>
            </section>

            {/* Error state */}
            {state.status === "error" && (
              <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-red-800 dark:text-red-200">
                    Scan failed
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {state.message}
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {/* Result — directly under upload, constrained to this column */}
            {state.status === "success" && (
              <div className="flex flex-col gap-4 w-full min-w-0">
            {/* Preview + label */}
            <div className="rounded-2xl overflow-hidden bg-card border border-border">
              {state.previewUrl && (
                <div className="aspect-[4/3] max-h-52 sm:max-h-64 md:aspect-video md:max-h-none bg-muted relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={state.previewUrl}
                    alt="Scanned food"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4 space-y-3">
                <h2 className="text-xl font-bold text-card-foreground capitalize">
                  {state.result.label}
                </h2>
                {confidencePres && (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${TIER_BADGE[confidencePres.tier]}`}
                      >
                        {confidencePres.tierLabel} confidence
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        Model {Math.round(state.result.confidence * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {confidencePres.explanation}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Flag badges */}
            {state.result.flags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  Health & safety
                </h3>
                <div className="flex flex-wrap gap-2">
                  {state.result.flags.map((flag, i) => (
                    <span
                      key={i}
                      title={flag.message}
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${FLAG_COLORS[flag.severity]}`}
                    >
                      {flag.type.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Nutrition card */}
            {state.result.nutrition && (() => {
              const n = state.result.nutrition;
              const mult = servingMultiplier;
              const scaledGrams = Math.round(n.serving_grams * mult);
              const idx = SERVING_STEPS.indexOf(mult);
              const canDecrease = idx > 0;
              const canIncrease = idx < SERVING_STEPS.length - 1;
              const healthInsight = getHealthInsight({
                calories: n.calories * mult,
                protein_g: n.protein_g * mult,
                fat_g: n.fat_g * mult,
                carbs_g: n.carbs_g * mult,
                sugar_g: n.sugar_g * mult,
                sodium_mg: n.sodium_mg * mult,
                fiber_g: n.fiber_g * mult,
              });
              const mealQualityScore = getMealQualityScore({
                calories: n.calories * mult,
                protein_g: n.protein_g * mult,
                fat_g: n.fat_g * mult,
                sugar_g: n.sugar_g * mult,
                sodium_mg: n.sodium_mg * mult,
                saturated_fat_g: n.saturated_fat_g * mult,
                fiber_g: n.fiber_g * mult,
              });
              return (
                <>
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 bg-muted/50 border-b border-border">
                    <h3 className="font-semibold text-card-foreground">
                      Nutrition
                    </h3>
                    <div className="mt-2 flex items-center justify-between gap-4">
                      <p className="text-xs text-muted-foreground">
                        {mult}x serving · {scaledGrams}g
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setServingMultiplier(SERVING_STEPS[idx - 1] ?? mult)
                          }
                          disabled={!canDecrease}
                          aria-label="Decrease serving size"
                          className="size-8 rounded-lg border border-input bg-background text-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent transition-colors"
                        >
                          <span className="text-lg leading-none">−</span>
                        </button>
                        <span className="min-w-[4rem] text-center text-sm font-medium text-foreground">
                          {mult}x
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setServingMultiplier(SERVING_STEPS[idx + 1] ?? mult)
                          }
                          disabled={!canIncrease}
                          aria-label="Increase serving size"
                          className="size-8 rounded-lg border border-input bg-background text-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent transition-colors"
                        >
                          <span className="text-lg leading-none">+</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-2xl font-bold text-card-foreground">
                        {Math.round(n.calories * mult)}
                      </p>
                      <p className="text-xs text-muted-foreground">Calories</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-card-foreground">
                        {(n.protein_g * mult).toFixed(1)}g
                      </p>
                      <p className="text-xs text-muted-foreground">Protein</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-card-foreground">
                        {(n.fat_g * mult).toFixed(1)}g
                      </p>
                      <p className="text-xs text-muted-foreground">Fat</p>
                      {n.saturated_fat_g > 0 && (
                        <p className="text-xs text-muted-foreground">
                          sat {(n.saturated_fat_g * mult).toFixed(1)}g
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-card-foreground">
                        {(n.carbs_g * mult).toFixed(1)}g
                      </p>
                      <p className="text-xs text-muted-foreground">Carbs</p>
                      {n.sugar_g > 0 && (
                        <p className="text-xs text-muted-foreground">
                          sugar {(n.sugar_g * mult).toFixed(1)}g
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-card-foreground">
                        {Math.round(n.sodium_mg * mult)}mg
                      </p>
                      <p className="text-xs text-muted-foreground">Sodium</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-card-foreground">
                        {(n.fiber_g * mult).toFixed(1)}g
                      </p>
                      <p className="text-xs text-muted-foreground">Fiber</p>
                    </div>
                  </div>
                  {mealQualityScore != null && (
                    <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-muted/25">
                      <span className="text-sm font-medium text-foreground">
                        Meal quality score
                      </span>
                      <span className="text-2xl font-bold tabular-nums text-foreground">
                        {mealQualityScore}
                      </span>
                    </div>
                  )}
                </div>
                {healthInsight && (
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5">
                    <h3 className="text-sm font-semibold text-card-foreground">
                      Health insight
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {healthInsight}
                    </p>
                  </div>
                )}
                </>
              );
            })()}

            {!state.result.nutrition && (
              <p className="text-sm text-muted-foreground py-2">
                Nutrition data unavailable for this food.
              </p>
            )}

            {state.result.id && (
              <EditScanResult
                scanId={state.result.id}
                className="rounded-2xl border border-border bg-card p-4"
                defaults={
                  state.result.nutrition
                    ? {
                        foodLabel: state.result.label,
                        portion: servingMultiplier,
                        calories:
                          state.result.nutrition.calories * servingMultiplier,
                        proteinG:
                          state.result.nutrition.protein_g * servingMultiplier,
                        carbsG:
                          state.result.nutrition.carbs_g * servingMultiplier,
                        fatG:
                          state.result.nutrition.fat_g * servingMultiplier,
                      }
                    : {
                        foodLabel: state.result.label,
                        portion: 1,
                        calories: 0,
                        proteinG: 0,
                        carbsG: 0,
                        fatG: 0,
                      }
                }
                onSaved={(v) => {
                  const prevMult = servingMultiplier;
                  setServingMultiplier(v.portion);
                  setState((prev) => {
                    if (prev.status !== "success") return prev;
                    const p = v.portion;
                    const n0 = prev.result.nutrition;
                    if (!n0) {
                      const nextNut = {
                        calories: v.calories / p,
                        protein_g: v.proteinG / p,
                        fat_g: v.fatG / p,
                        carbs_g: v.carbsG / p,
                        saturated_fat_g: 0,
                        sugar_g: 0,
                        sodium_mg: 0,
                        fiber_g: 0,
                        serving_grams: 100,
                        serving_label: "serving",
                      };
                      return {
                        status: "success",
                        previewUrl: prev.previewUrl,
                        result: {
                          ...prev.result,
                          label: v.foodLabel,
                          nutrition: nextNut,
                        },
                      };
                    }
                    const calBase = n0.calories;
                    const perField = (x: number) =>
                      calBase > 0 ? (x * v.calories) / (calBase * p) : 0;
                    const nextNut = {
                      ...n0,
                      calories: v.calories / p,
                      protein_g: v.proteinG / p,
                      fat_g: v.fatG / p,
                      carbs_g: v.carbsG / p,
                      sugar_g: perField(n0.sugar_g * prevMult),
                      sodium_mg: perField(n0.sodium_mg * prevMult),
                      fiber_g: perField(n0.fiber_g * prevMult),
                      saturated_fat_g: perField(n0.saturated_fat_g * prevMult),
                    };
                    return {
                      status: "success",
                      previewUrl: prev.previewUrl,
                      result: {
                        ...prev.result,
                        label: v.foodLabel,
                        nutrition: nextNut,
                      },
                    };
                  });
                  void refreshTodayTotals();
                }}
              />
            )}

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-3 rounded-xl border border-input text-foreground font-medium hover:bg-accent transition-colors"
            >
              Scan another
            </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
