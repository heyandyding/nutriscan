"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/spinner";
import { ThemeToggle } from "@/components/theme-toggle";
import { getScanConfidencePresentation } from "@/lib/scan-confidence";
import { getHealthInsight } from "@/lib/health-insight";
import { getMealQualityScore } from "@/lib/meal-quality-score";
import { EditScanResult } from "@/components/edit-scan-result";

type Scan = {
  id: string;
  food_label: string;
  created_at: string;
  confidence: number | null;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  sodium_mg: number | null;
  sugar_g: number | null;
  portion_multiplier: number | null;
  flags: Array<{ type: string; severity: string; message: string }> | null;
};

const FLAG_COLORS: Record<string, string> = {
  red: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40",
  orange: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40",
  yellow:
    "bg-yellow-500/15 text-yellow-800 dark:text-yellow-200 border-yellow-500/40",
};

const TIER_BADGE: Record<string, string> = {
  high: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-200 border-emerald-500/20",
  medium: "bg-muted/80 text-muted-foreground border-border",
  low: "bg-amber-500/10 text-amber-900 dark:text-amber-100 border-amber-500/20",
};

function ResultPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const startEdit = searchParams.get("edit") === "1";

  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchScan() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("scans")
        .select(
          "id, food_label, created_at, confidence, calories, protein_g, fat_g, carbs_g, sodium_mg, sugar_g, portion_multiplier, flags"
        )
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (fetchError) {
        setError(fetchError.code === "PGRST116" ? "Scan not found" : "Failed to load");
      } else {
        setScan(data as Scan);
      }
      setLoading(false);
    }
    fetchScan();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <Spinner />
        <p className="text-sm text-muted-foreground">
          Loading scan…
        </p>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-muted-foreground text-center mb-6">
          {error ?? "Scan not found"}
        </p>
        <Link
          href="/history"
          className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
        >
          ← Back to history
        </Link>
      </div>
    );
  }

  const date = new Date(scan.created_at).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const portion = scan.portion_multiplier ?? 1;

  const confidencePres = getScanConfidencePresentation(
    scan.food_label,
    scan.confidence ?? 0
  );

  const healthInsight =
    scan.calories != null
      ? getHealthInsight({
          calories: scan.calories,
          protein_g: scan.protein_g ?? 0,
          fat_g: scan.fat_g ?? 0,
          carbs_g: scan.carbs_g ?? 0,
          sugar_g: scan.sugar_g ?? 0,
          sodium_mg: scan.sodium_mg ?? 0,
        })
      : null;

  const mealQualityScore =
    scan.calories != null
      ? getMealQualityScore({
          calories: scan.calories,
          protein_g: scan.protein_g ?? 0,
          fat_g: scan.fat_g ?? 0,
          sugar_g: scan.sugar_g ?? 0,
          sodium_mg: scan.sodium_mg ?? 0,
        })
      : null;

  const editDefaults = {
    foodLabel: scan.food_label,
    portion,
    calories: scan.calories ?? 0,
    proteinG: scan.protein_g ?? 0,
    carbsG: scan.carbs_g ?? 0,
    fatG: scan.fat_g ?? 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/history"
            className="text-muted-foreground hover:text-foreground text-sm font-medium"
          >
            ← History
          </Link>
          <h1 className="text-lg font-semibold text-foreground">
            Scan result
          </h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-xl font-bold text-card-foreground capitalize">
            {scan.food_label}
          </h2>
          <p className="text-sm text-muted-foreground">{date}</p>
          <div className="space-y-1.5 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${TIER_BADGE[confidencePres.tier] ?? TIER_BADGE.medium}`}
              >
                {confidencePres.tierLabel} confidence
              </span>
              {scan.confidence != null && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  Model {Math.round(scan.confidence * 100)}%
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              {confidencePres.explanation}
            </p>
          </div>

          <EditScanResult
            scanId={scan.id}
            startOpen={startEdit}
            defaults={editDefaults}
            onSaved={(v) => {
              const prevCal = scan.calories ?? 0;
              const ratio =
                prevCal > 0 && v.calories > 0 ? v.calories / prevCal : 1;
              setScan((s) =>
                s
                  ? {
                      ...s,
                      food_label: v.foodLabel,
                      portion_multiplier: v.portion,
                      calories: v.calories,
                      protein_g: v.proteinG,
                      fat_g: v.fatG,
                      carbs_g: v.carbsG,
                      sugar_g:
                        s.sugar_g != null
                          ? Math.round(s.sugar_g * ratio * 100) / 100
                          : null,
                      sodium_mg:
                        s.sodium_mg != null
                          ? Math.round(s.sodium_mg * ratio * 100) / 100
                          : null,
                    }
                  : null
              );
            }}
          />
        </div>

        {scan.flags && scan.flags.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Health & safety
            </h3>
            <div className="flex flex-wrap gap-2">
              {scan.flags.map((flag, i) => (
                <span
                  key={i}
                  title={flag.message}
                  className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${
                    FLAG_COLORS[flag.severity] ?? FLAG_COLORS.orange
                  }`}
                >
                  {flag.type.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 bg-muted/50 border-b border-border">
            <h3 className="font-semibold text-card-foreground">
              Nutrition
            </h3>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {scan.calories != null && (
              <div>
                <p className="text-2xl font-bold text-card-foreground">
                  {Math.round(scan.calories)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Calories
                </p>
              </div>
            )}
            {scan.protein_g != null && (
              <div>
                <p className="text-2xl font-bold text-card-foreground">
                  {scan.protein_g.toFixed(1)}g
                </p>
                <p className="text-xs text-muted-foreground">
                  Protein
                </p>
              </div>
            )}
            {scan.fat_g != null && (
              <div>
                <p className="text-2xl font-bold text-card-foreground">
                  {scan.fat_g.toFixed(1)}g
                </p>
                <p className="text-xs text-muted-foreground">
                  Fat
                </p>
              </div>
            )}
            {scan.carbs_g != null && (
              <div>
                <p className="text-2xl font-bold text-card-foreground">
                  {scan.carbs_g.toFixed(1)}g
                </p>
                <p className="text-xs text-muted-foreground">
                  Carbs
                </p>
                {scan.sugar_g != null && scan.sugar_g > 0 && (
                  <p className="text-xs text-muted-foreground">
                    sugar {scan.sugar_g.toFixed(1)}g
                  </p>
                )}
              </div>
            )}
            {scan.sodium_mg != null && (
              <div>
                <p className="text-lg font-bold text-card-foreground">
                  {Math.round(scan.sodium_mg)}mg
                </p>
                <p className="text-xs text-muted-foreground">
                  Sodium
                </p>
              </div>
            )}
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
          {scan.calories == null &&
            scan.protein_g == null &&
            scan.fat_g == null &&
            scan.carbs_g == null &&
            scan.sodium_mg == null && (
              <p className="p-4 text-sm text-muted-foreground">
                No nutrition data available.
              </p>
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
      </main>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
          <Spinner />
          <p className="text-sm text-muted-foreground">
            Loading scan…
          </p>
        </div>
      }
    >
      <ResultPageInner />
    </Suspense>
  );
}
