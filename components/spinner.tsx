export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-full border-2 border-emerald-500 border-t-transparent animate-spin ${className ?? "w-10 h-10"}`}
      role="status"
      aria-label="Loading"
    />
  );
}
