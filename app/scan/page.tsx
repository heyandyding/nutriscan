"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Spinner } from "@/components/spinner";
import { ThemeToggle } from "@/components/theme-toggle";

type ScanResult = {
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

export default function ScanPage() {
  const [state, setState] = useState<ScanState>({ status: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }

  const isLowConfidence =
    state.status === "success" && state.result.confidence < 0.6;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 text-sm font-medium"
          >
            ← Back
          </Link>
          <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
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

      <main className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Upload area */}
        <section className="rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 p-8 text-center transition-colors hover:border-stone-400 dark:hover:border-stone-600">
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
                <p className="text-stone-600 dark:text-stone-400 font-medium">
                  Analyzing…
                </p>
                <p className="text-sm text-stone-500 dark:text-stone-500">
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
                <p className="text-stone-700 dark:text-stone-300 font-semibold">
                  Upload or take a photo
                </p>
                <p className="text-sm text-stone-500 dark:text-stone-500">
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

        {/* Result */}
        {state.status === "success" && (
          <div className="flex flex-col gap-4">
            {/* Low confidence warning */}
            {isLowConfidence && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/30 p-3 flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400">⚠️</span>
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                    Low confidence ({Math.round(state.result.confidence * 100)}%)
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                    The result may be incorrect. Please confirm or correct the
                    food name.
                  </p>
                </div>
              </div>
            )}

            {/* Preview + label */}
            <div className="rounded-2xl overflow-hidden bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
              {state.previewUrl && (
                <div className="aspect-video bg-stone-100 dark:bg-stone-800 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={state.previewUrl}
                    alt="Scanned food"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 capitalize">
                  {state.result.label}
                </h2>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                  Confidence: {Math.round(state.result.confidence * 100)}%
                </p>
              </div>
            </div>

            {/* Flag badges */}
            {state.result.flags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
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
            {state.result.nutrition && (
              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
                <div className="px-4 py-3 bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-800">
                  <h3 className="font-semibold text-stone-900 dark:text-stone-100">
                    Nutrition
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Per {state.result.nutrition.serving_label}
                  </p>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                      {Math.round(state.result.nutrition.calories)}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Calories
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                      {state.result.nutrition.protein_g.toFixed(1)}g
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Protein
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                      {state.result.nutrition.fat_g.toFixed(1)}g
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Fat
                    </p>
                    {state.result.nutrition.saturated_fat_g > 0 && (
                      <p className="text-xs text-stone-400 dark:text-stone-500">
                        sat {state.result.nutrition.saturated_fat_g.toFixed(1)}g
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                      {state.result.nutrition.carbs_g.toFixed(1)}g
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Carbs
                    </p>
                    {state.result.nutrition.sugar_g > 0 && (
                      <p className="text-xs text-stone-400 dark:text-stone-500">
                        sugar {state.result.nutrition.sugar_g.toFixed(1)}g
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-stone-900 dark:text-stone-100">
                      {Math.round(state.result.nutrition.sodium_mg)}mg
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Sodium
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-stone-900 dark:text-stone-100">
                      {state.result.nutrition.fiber_g.toFixed(1)}g
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Fiber
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!state.result.nutrition && (
              <p className="text-sm text-stone-500 dark:text-stone-400 py-2">
                Nutrition data unavailable for this food.
              </p>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-3 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              Scan another
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
