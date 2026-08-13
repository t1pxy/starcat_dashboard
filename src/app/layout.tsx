import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

// Geist has no Thai glyphs, so Thai text would fall back to a system font and
// render inconsistently across machines. Noto Sans Thai covers both scripts.
const notoSansThai = Noto_Sans_Thai({
  variable: "--font-sans-thai",
  subsets: ["thai", "latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Starcat Dashboard",
  description: "Dashboard อุปกรณ์จากระบบ Starcat Helpdesk",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${notoSansThai.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {children}
      </body>
    </html>
  );
}
