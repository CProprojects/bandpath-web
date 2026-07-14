import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "BandPath — Your smartest path to IELTS Band 7+",
  description:
    "IELTS Academic prep platform with real mock tests, spaced-repetition vocabulary, and band score tracking.",
};

// colorScheme tells browsers this site is intentionally dark, so browsers
// with a "force dark mode for all sites" feature (Samsung Internet, some
// Yandex Browser builds) don't double-invert our already-dark theme.
export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0f2744",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
