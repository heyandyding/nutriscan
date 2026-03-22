"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/spinner";
import { ThemeToggle } from "@/components/theme-toggle";

type Scan = {
  id: string;
  food_label: string;
  created_at: string;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  sodium_mg: number | null;
  sugar_g: number | null;
  flags: Array<{ type: string; severity: string; message: string }> | null;
};

const FLAG_COLORS: Record<string, string> = {
  red: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40",
  orange: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40",
  yellow:
    "bg-yellow-500/15 text-yellow-800 dark:text-yellow-200 border-yellow-500/40",
};

export default function ResultPage() {
  const params = useParams();
  const id = params.id as string;
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
        .select("id, food_label, created_at, calories, protein_g, fat_g, carbs_g, sodium_mg, sugar_g, flags")
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
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-xl font-bold text-card-foreground capitalize">
            {scan.food_label}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {date}
          </p>
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
      </main>
    </div>
  );
}
