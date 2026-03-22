"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
        <div
          className="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"
          aria-hidden
        />
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-stone-600 dark:text-stone-400 mb-4">
            {error ?? "Scan not found"}
          </p>
          <Link
            href="/history"
            className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
          >
            ← Back to history
          </Link>
        </div>
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
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <header className="border-b border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/history"
            className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 text-sm font-medium"
          >
            ← History
          </Link>
          <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            Scan result
          </h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 capitalize">
            {scan.food_label}
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            {date}
          </p>
        </div>

        {scan.flags && scan.flags.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
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

        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
          <div className="px-4 py-3 bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-800">
            <h3 className="font-semibold text-stone-900 dark:text-stone-100">
              Nutrition
            </h3>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {scan.calories != null && (
              <div>
                <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                  {Math.round(scan.calories)}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Calories
                </p>
              </div>
            )}
            {scan.protein_g != null && (
              <div>
                <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                  {scan.protein_g.toFixed(1)}g
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Protein
                </p>
              </div>
            )}
            {scan.fat_g != null && (
              <div>
                <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                  {scan.fat_g.toFixed(1)}g
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Fat
                </p>
              </div>
            )}
            {scan.carbs_g != null && (
              <div>
                <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                  {scan.carbs_g.toFixed(1)}g
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Carbs
                </p>
                {scan.sugar_g != null && scan.sugar_g > 0 && (
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    sugar {scan.sugar_g.toFixed(1)}g
                  </p>
                )}
              </div>
            )}
            {scan.sodium_mg != null && (
              <div>
                <p className="text-lg font-bold text-stone-900 dark:text-stone-100">
                  {Math.round(scan.sodium_mg)}mg
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
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
              <p className="p-4 text-sm text-stone-500 dark:text-stone-400">
                No nutrition data available.
              </p>
            )}
        </div>
      </main>
    </div>
  );
}
