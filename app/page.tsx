"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";

export default function Home() {
  const t = useT();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t.landing.title}</h1>
        <p className="text-muted-foreground">{t.landing.subtitle}</p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.landing.problemTitle}</h2>
        <p className="max-w-3xl">{t.landing.problem}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t.landing.howTitle}</h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.landing.steps.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-xl border p-4">
              <span className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {i + 1}
              </span>
              <div className="flex flex-col gap-1">
                <span className="font-medium">{s.title}</span>
                <span className="text-muted-foreground text-sm">{s.desc}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-col items-start gap-3">
        <Button size="lg" asChild>
          <Link href="/citizen">{t.landing.startDemo}</Link>
        </Button>
        <p className="text-muted-foreground text-xs">{t.landing.simulated}</p>
      </div>
    </main>
  );
}
