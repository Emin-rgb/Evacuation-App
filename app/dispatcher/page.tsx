import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";

export default function DispatcherPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.dispatcher.title}</h1>
        <p className="text-muted-foreground">{t.dispatcher.subtitle}</p>
      </div>
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t.dispatcher.alerts}</h2>
          <Skeleton className="h-20 w-full rounded-xl" />
        </section>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-xl" />
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              {[t.dispatcher.tabSos, t.dispatcher.tabShelters, t.dispatcher.tabTeams].map((l) => (
                <span key={l} className="rounded-md bg-muted px-3 py-1.5 text-sm font-medium">
                  {l}
                </span>
              ))}
            </div>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
