"use client";

import { CitizenView } from "@/components/citizen-view";
import { useT } from "@/lib/i18n/provider";

export default function CitizenPage() {
  const t = useT();
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-28">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.citizen.title}</h1>
        <p className="text-muted-foreground">{t.citizen.subtitle}</p>
      </div>
      <CitizenView />
    </main>
  );
}
