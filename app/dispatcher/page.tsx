"use client";

import { DispatcherGate } from "@/components/dispatcher-gate";
import { useT } from "@/lib/i18n/provider";

export default function DispatcherPage() {
  const t = useT();
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.dispatcher.title}</h1>
        <p className="text-muted-foreground">{t.dispatcher.subtitle}</p>
      </div>
      <DispatcherGate />
    </main>
  );
}
