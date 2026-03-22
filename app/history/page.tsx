"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/spinner";
import { ThemeToggle } from "@/components/theme-toggle";

type Scan = {
  id: string;
  food_label: string;
  created_at: string;
  calories: number | null;
  flags: Array<{ type: string; severity: string; message: string }> | null;
};

const FLAG_COLORS: Record<string, string> = {
  red: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40",
  orange: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40",
  yellow:
    "bg-yellow-500/15 text-yellow-800 dark:text-yellow-200 border-yellow-500/40",
};

export default function HistoryPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function fetchScans() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("scans")
        .select("id, food_label, created_at, calories, flags")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error) {
        setScans((data as Scan[]) ?? []);
      }
      setLoading(false);
    }
    fetchScans();
  }, []);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("scans").delete().eq("id", id);
    setScans((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
  }

  function getAvgDailyCaloriesLast7Days(): number | null {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = scans.filter((s) => new Date(s.created_at) >= sevenDaysAgo);
    const total = recent.reduce(
      (sum, s) => sum + (s.calories ?? 0),
      0
    );
    if (recent.length === 0) return null;
    return Math.round(total / 7);
  }

  const avgDailyCal = getAvgDailyCaloriesLast7Days();

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const scanDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round(
      (todayStart.getTime() - scanDayStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays > 0 && diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground text-sm font-medium"
          >
            ← Back
          </Link>
          <h1 className="text-lg font-semibold text-foreground">
            Scan History
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href="/scan"
              className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Scan
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 min-h-[50vh]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Spinner />
            <p className="text-sm text-muted-foreground">
              Loading your history…
            </p>
          </div>
        ) : scans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              No scans yet. Take a photo of food to see nutrition facts and build
              your history.
            </p>
            <Link
              href="/scan"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-3 transition-colors"
            >
              Scan food
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Avg daily calories (last 7 days)
                </p>
                <p className="text-2xl font-bold text-card-foreground mt-0.5">
                  {avgDailyCal != null ? `${avgDailyCal} kcal` : "—"}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {scans.length} scan{scans.length !== 1 ? "s" : ""}
              </p>
            </div>
            {scans.map((scan) => (
              <div
                key={scan.id}
                className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-4"
              >
                <Link
                  href={`/result/${scan.id}`}
                  className="flex-1 min-w-0"
                >
                  <h2 className="font-semibold text-card-foreground capitalize truncate">
                    {scan.food_label}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {formatDate(scan.created_at)}
                    {scan.calories != null &&
                      ` · ${Math.round(scan.calories)} kcal`}
                  </p>
                  {scan.flags && scan.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {scan.flags.slice(0, 4).map((flag, i) => (
                        <span
                          key={i}
                          title={flag.message}
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
                            FLAG_COLORS[flag.severity] ?? FLAG_COLORS.orange
                          }`}
                        >
                          {flag.type.replace(/_/g, " ")}
                        </span>
                      ))}
                      {scan.flags.length > 4 && (
                        <span className="text-xs text-muted-foreground">
                          +{scan.flags.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(scan.id);
                  }}
                  disabled={deletingId === scan.id}
                  aria-label={`Delete ${scan.food_label}`}
                  className="flex-shrink-0 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
