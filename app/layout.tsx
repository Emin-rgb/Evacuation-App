import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: t.app.name,
  description: t.app.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="az" className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}>
      <body className="flex min-h-full flex-col"><SiteHeader />
        {children}
      </body>
    </html>
  );
}
