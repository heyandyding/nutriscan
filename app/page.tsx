import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Camera, UtensilsCrossed, History } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            NutriScan
          </span>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero */}
        <section className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 dark:from-primary/10 dark:via-transparent dark:to-primary/5" />
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
              NutriScan
            </h1>
            <p className="mt-6 text-xl sm:text-2xl text-muted-foreground leading-relaxed">
              Point your camera at any food—get instant nutrition facts, allergen
              alerts, and health flags. Track what you eat over time and make
              smarter choices.
            </p>
            <div className="mt-12">
              <Button asChild size="lg" className="text-base px-8 py-6 h-auto">
                <Link href="/login">Get Started</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Feature cards */}
        <section className="border-t border-border bg-muted/30 dark:bg-muted/10 py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <div className="size-12 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-2">
                    <Camera className="size-6 text-primary" />
                  </div>
                  <CardTitle>Identify Food</CardTitle>
                  <CardDescription>
                    Take a photo of any food item. Our ML model identifies it
                    instantly with a confidence score.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <div className="size-12 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-2">
                    <UtensilsCrossed className="size-6 text-primary" />
                  </div>
                  <CardTitle>Get Nutrition Facts</CardTitle>
                  <CardDescription>
                    See calories, protein, fat, carbs, sodium, and more.
                    Color-coded flags highlight allergens and health concerns.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <div className="size-12 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-2">
                    <History className="size-6 text-primary" />
                  </div>
                  <CardTitle>Track History</CardTitle>
                  <CardDescription>
                    Save every scan to your personal history. View average daily
                    calories and review past meals.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
