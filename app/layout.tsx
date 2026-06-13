import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PremiumProvider } from "@/components/PremiumProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { BackgroundField } from "@/components/BackgroundField";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-loaded",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono-loaded",
  display: "swap",
});

const SITE = "https://easyprompt.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "EasyPrompt — Fill. Copy. Paste.",
    template: "%s · EasyPrompt",
  },
  description:
    "A prompt builder for everyone. Pick a template, fill out a short form, and get a perfectly crafted prompt to paste into ChatGPT, Claude, or Gemini. Free to use — create a free account to save prompts and build your own templates. Optional Pro Boosters sharpen the output.",
  keywords: [
    "AI prompt generator",
    "prompt builder",
    "ChatGPT prompts",
    "Claude prompts",
    "free prompt templates",
  ],
  openGraph: {
    type: "website",
    siteName: "EasyPrompt",
    title: "EasyPrompt — Fill. Copy. Paste.",
    description:
      "Pick a template, fill a short form, get a perfectly crafted AI prompt. Free to use — save your work with a free account.",
    url: SITE,
  },
  twitter: {
    card: "summary_large_image",
    title: "EasyPrompt — Fill. Copy. Paste.",
    description:
      "Pick a template, fill a short form, get a perfectly crafted AI prompt. Free to use — save your work with a free account.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrains.variable}`}
        style={
          {
            // Bind the design-system font tokens to the next/font families.
            "--font-sans":
              "var(--font-sans-loaded), -apple-system, system-ui, 'Segoe UI', sans-serif",
            "--font-mono":
              "var(--font-mono-loaded), ui-monospace, Menlo, monospace",
          } as React.CSSProperties
        }
      >
        <PremiumProvider />
        <AuthProvider />
        <BackgroundField />
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
