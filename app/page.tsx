"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserGroup03Icon, HeadsetIcon } from "@hugeicons/core-free-icons";
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
    cta: t.landing.citizenCta,
  },
  {
    href: "/dispatcher",
    icon: HeadsetIcon,
    title: t.landing.dispatcherTitle,
    desc: t.landing.dispatcherDesc,
    cta: t.landing.dispatcherCta,
  },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t.landing.title}</h1>
        <p className="text-muted-foreground">{t.landing.subtitle}</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="group">
            <Card className="h-full rounded-xl transition-colors group-hover:bg-accent">
              <CardHeader>
                <HugeiconsIcon icon={c.icon} className="mb-2 size-8 text-primary" aria-hidden="true" />
                <CardTitle className="text-xl">{c.title}</CardTitle>
                <CardDescription>{c.desc}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm font-medium text-primary">{c.cta} →</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
