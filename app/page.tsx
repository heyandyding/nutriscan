import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-stone-950">
      <header className="border-b border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-end">
          <Link
            href="/login"
            className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 dark:text-stone-100 text-center tracking-tight">
          NutriScan
        </h1>
        <p className="mt-4 text-lg text-stone-600 dark:text-stone-400 text-center max-w-md">
          Scan food with your camera, get instant nutrition facts, and track your
          food history. Identify allergens, monitor sugar and sodium, and make
          healthier choices.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 transition-colors"
          >
            Sign in to get started
          </Link>
          <Link
            href="/login?redirect=/scan"
            className="inline-flex items-center justify-center rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-medium px-6 py-3 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            Start scanning
          </Link>
        </div>
      </main>
    </div>
  );
}
