"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <header className="border-b border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 text-sm font-medium"
          >
            ← Back
          </Link>
          <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            Scan History
          </h1>
          <Link
            href="/scan"
            className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Scan
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div
              className="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"
              aria-hidden
            />
          </div>
        ) : scans.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-stone-600 dark:text-stone-400 mb-4">
              No scans yet. Start by scanning some food!
            </p>
            <Link
              href="/scan"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 transition-colors"
            >
              Scan food
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
              {scans.length} scan{scans.length !== 1 ? "s" : ""}
            </p>
            {scans.map((scan) => (
              <div
                key={scan.id}
                className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 flex items-center justify-between gap-4"
              >
                <Link
                  href={`/result/${scan.id}`}
                  className="flex-1 min-w-0"
                >
                  <h2 className="font-semibold text-stone-900 dark:text-stone-100 capitalize truncate">
                    {scan.food_label}
                  </h2>
                  <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
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
                        <span className="text-xs text-stone-400">
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
                  className="flex-shrink-0 p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
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
