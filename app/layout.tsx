import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PremiumProvider } from "@/components/PremiumProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { BackgroundField } from "@/components/BackgroundField";
import { Analytics } from "@vercel/analytics/next";

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
const ENABLE_ANALYTICS = process.env.NODE_ENV === "production" && Boolean(process.env.VERCEL);

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "EasyPrompt - Reusable prompt workspace",
    template: "%s - EasyPrompt",
  },
  description:
    "Browse reusable AI prompt Templates, ready-to-copy Prompts, and guided Workflows for ChatGPT, Claude, Gemini, and Codex.",
  keywords: [
    "AI prompt templates",
    "reusable prompts",
    "ChatGPT prompts",
    "Claude prompts",
    "ready-to-copy prompts",
    "AI workflow prompts",
  ],
  openGraph: {
    type: "website",
    siteName: "EasyPrompt",
    title: "EasyPrompt - Reusable prompt workspace",
    description:
      "Browse reusable Templates, copy ready Prompts, and follow guided Workflows for bigger tasks.",
    url: SITE,
  },
  twitter: {
    card: "summary_large_image",
    title: "EasyPrompt - Reusable prompt workspace",
    description:
      "Browse reusable Templates, copy ready Prompts, and follow guided Workflows for bigger tasks.",
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
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <PremiumProvider />
        <AuthProvider />
        <BackgroundField />
        <Nav />
        <div id="main-content" className="site-content" tabIndex={-1}>
          {children}
        </div>
        <Footer />
        {ENABLE_ANALYTICS && <Analytics />}
      </body>
    </html>
  );
}
