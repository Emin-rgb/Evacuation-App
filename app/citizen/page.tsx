import { CitizenView } from "@/components/citizen-view";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";

export default function CitizenPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-28">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.citizen.title}</h1>
        <p className="text-muted-foreground">{t.citizen.subtitle}</p>
      </div>
      <CitizenView />
      <div className="fixed inset-x-0 bottom-0 border-t bg-background p-4">
        <div className="mx-auto flex max-w-6xl gap-3">
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 flex-1 rounded-xl" />
        </div>
      </div>
    </main>
  );
}
