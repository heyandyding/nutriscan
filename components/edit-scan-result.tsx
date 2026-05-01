"use client";

import { useEffect, useState } from "react";

export type EditScanFormDefaults = {
  foodLabel: string;
  portion: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

type Props = {
  scanId: string;
  defaults: EditScanFormDefaults;
  /** When true, expand the form on mount (e.g. ?edit=1) */
  startOpen?: boolean;
  onSaved?: (values: EditScanFormDefaults) => void;
  className?: string;
};

export function EditScanResult({
  scanId,
  defaults,
  startOpen = false,
  onSaved,
  className = "",
}: Props) {
  const [open, setOpen] = useState(startOpen);
  const [foodLabel, setFoodLabel] = useState(defaults.foodLabel);
  const [portion, setPortion] = useState(String(defaults.portion));
  const [calories, setCalories] = useState(String(Math.round(defaults.calories)));
  const [proteinG, setProteinG] = useState(String(defaults.proteinG));
  const [carbsG, setCarbsG] = useState(String(defaults.carbsG));
  const [fatG, setFatG] = useState(String(defaults.fatG));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFoodLabel(defaults.foodLabel);
    setPortion(String(defaults.portion));
    setCalories(String(Math.round(defaults.calories)));
    setProteinG(String(defaults.proteinG));
    setCarbsG(String(defaults.carbsG));
    setFatG(String(defaults.fatG));
  }, [
    defaults.foodLabel,
    defaults.portion,
    defaults.calories,
    defaults.proteinG,
    defaults.carbsG,
    defaults.fatG,
  ]);

  useEffect(() => {
    if (startOpen) setOpen(true);
  }, [startOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const p = parseFloat(portion);
    const cal = parseFloat(calories);
    const prot = parseFloat(proteinG);
    const carb = parseFloat(carbsG);
    const fat = parseFloat(fatG);

    if (!foodLabel.trim()) {
      setError("Enter a food name");
      return;
    }
    if (!Number.isFinite(p) || p <= 0 || p > 50) {
      setError("Portion must be between 0 and 50 servings");
      return;
    }
    if (!Number.isFinite(cal) || cal < 0) {
      setError("Enter calories");
      return;
    }
    if (
      !Number.isFinite(prot) ||
      prot < 0 ||
      !Number.isFinite(carb) ||
      carb < 0 ||
      !Number.isFinite(fat) ||
      fat < 0
    ) {
      setError("Enter protein, carbs, and fat (0 or more)");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/scans/${scanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          food_label: foodLabel.trim(),
          portion_multiplier: p,
          calories: cal,
          protein_g: prot,
          carbs_g: carb,
          fat_g: fat,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Save failed");
        return;
      }

      const next: EditScanFormDefaults = {
        foodLabel: foodLabel.trim(),
        portion: p,
        calories: cal,
        proteinG: prot,
        carbsG: carb,
        fatG: fat,
      };
      onSaved?.(next);
      setOpen(false);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setError(null);
        }}
        className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
      >
        {open ? "Cancel edit" : "Edit result"}
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 rounded-xl border border-border bg-card p-4 space-y-3"
        >
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Food name
            </label>
            <input
              type="text"
              value={foodLabel}
              onChange={(e) => setFoodLabel(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Portion (servings)
            </label>
            <input
              type="number"
              inputMode="decimal"
              min={0.25}
              max={50}
              step={0.25}
              value={portion}
              onChange={(e) => setPortion(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Calories
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Protein (g)
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                value={proteinG}
                onChange={(e) => setProteinG(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Carbs (g)
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                value={carbsG}
                onChange={(e) => setCarbsG(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Fat (g)
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                value={fatG}
                onChange={(e) => setFatG(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving…" : "Save to history"}
          </button>
        </form>
      )}
    </div>
  );
}
