"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserGroup03Icon, HeadsetIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n/provider";

export default function Home() {
  const t = useT();
  const cards = [
    {
      href: "/citizen",
      icon: UserGroup03Icon,
      title: t.landing.citizenTitle,
      desc: t.landing.citizenDesc,
      who: t.landing.whoCitizen,
      bullets: t.landing.citizenBullets,
      cta: t.landing.citizenCta,
    },
    {
      href: "/dispatcher",
      icon: HeadsetIcon,
      title: t.landing.dispatcherTitle,
      desc: t.landing.dispatcherDesc,
      who: t.landing.whoDispatcher,
      bullets: t.landing.dispatcherBullets,
      cta: t.landing.dispatcherCta,
    },
  ];

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

      <div className="grid gap-6 sm:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="group">
            <Card className="group-hover:bg-accent h-full rounded-xl transition-colors">
              <CardHeader>
                <HugeiconsIcon icon={c.icon} className="text-primary mb-2 size-8" aria-hidden="true" />
                <CardTitle className="text-xl">{c.title}</CardTitle>
                <CardDescription>{c.desc}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <p className="font-medium">{c.who}</p>
                <ul className="text-muted-foreground list-disc pl-5">
                  {c.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <span className="text-primary mt-1 font-medium">{c.cta} →</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex flex-col items-start gap-3">
        <Button size="lg" asChild>
          <Link href="/citizen">{t.landing.startDemo}</Link>
        </Button>
        <p className="text-muted-foreground text-sm">{t.landing.tip}</p>
        <p className="text-muted-foreground text-xs">{t.landing.simulated}</p>
      </div>
    </main>
  );
}
