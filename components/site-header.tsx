"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLanguage, useT } from "@/lib/i18n/provider";

export function SiteHeader() {
  const t = useT();
  const { lang, setLang } = useLanguage();
  const pathname = usePathname();
  const links = [
    { href: "/citizen", label: t.nav.citizen },
    { href: "/dispatcher", label: t.nav.dispatcher },
  ];
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <HugeiconsIcon icon={Shield01Icon} className="size-5 text-primary" aria-hidden="true" />
          {t.app.name}
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent",
                pathname.startsWith(l.href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
          <div role="group" aria-label={t.lang.label} className="ml-2 flex items-center gap-1">
            {(["az", "en"] as const).map((l) => (
              <Button
                key={l}
                size="sm"
                variant={lang === l ? "default" : "outline"}
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
              >
                {t.lang[l]}
              </Button>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
