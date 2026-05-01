import { FOOD_SCAN_GROUPS, formatFoodLabel } from "@/lib/food-options";

export function FoodScanOptions() {
  return (
    <section
      className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4"
      aria-labelledby="food-scan-options-heading"
    >
      <div>
        <h2
          id="food-scan-options-heading"
          className="text-base font-semibold text-card-foreground"
        >
          Current Food Scanning Options
        </h2>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          We currently only work on these 25 foods. Well-lit, higher resolution
          photos work best.
        </p>
      </div>
      <div className="space-y-4">
        {FOOD_SCAN_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {group.title}
            </h3>
            <ul className="flex flex-wrap gap-2 list-none m-0 p-0">
              {group.items.map((id) => (
                <li key={id}>
                  <span className="inline-flex rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground">
                    {formatFoodLabel(id)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
