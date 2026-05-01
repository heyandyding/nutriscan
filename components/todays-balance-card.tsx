import type { DayMacroTotals } from "@/lib/today-balance";
import { getTodayBalancePatternSentence } from "@/lib/today-balance";

type Props = {
  totals: DayMacroTotals;
  loading?: boolean;
  className?: string;
};

function formatInt(n: number): string {
  return Math.round(n).toLocaleString();
}

export function TodaysBalanceCard({
  totals,
  loading = false,
  className = "",
}: Props) {
  const pattern = getTodayBalancePatternSentence(totals);

  if (loading) {
    return (
      <section
        className={`rounded-2xl border border-border bg-card p-4 sm:p-5 ${className}`}
        aria-busy="true"
        aria-label="Today’s balance loading"
      >
        <div className="h-5 w-40 rounded bg-muted animate-pulse" />
        <div className="h-3 w-24 rounded bg-muted/80 animate-pulse mt-2" />
        <div className="grid grid-cols-2 gap-3 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-muted/60 animate-pulse" />
          ))}
        </div>
        <div className="h-10 rounded-lg bg-muted/50 animate-pulse mt-4" />
      </section>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 ${className}`}
      aria-labelledby="todays-balance-heading"
    >
      <div>
        <h2
          id="todays-balance-heading"
          className="text-base font-semibold text-card-foreground"
        >
          Today&apos;s Balance
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Today so far</p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Calories</dt>
          <dd className="text-lg font-bold tabular-nums text-card-foreground">
            {formatInt(totals.calories)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Protein</dt>
          <dd className="text-lg font-bold tabular-nums text-card-foreground">
            {totals.protein_g.toFixed(0)}g
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Carbs</dt>
          <dd className="text-lg font-bold tabular-nums text-card-foreground">
            {totals.carbs_g.toFixed(0)}g
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Fat</dt>
          <dd className="text-lg font-bold tabular-nums text-card-foreground">
            {totals.fat_g.toFixed(0)}g
          </dd>
        </div>
      </dl>

      <div className="pt-3 border-t border-border">
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Main pattern: </span>
          {pattern}
        </p>
      </div>
    </section>
  );
}
