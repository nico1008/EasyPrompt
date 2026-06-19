import Link from "next/link";
import { CATEGORIES } from "@/data/templates";

/* Global footer — absent in the mockups, required by the UI build plan
   (SEO category links, submit-a-template, legal). Built from system tokens. */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link className="brand" href="/">
            <span className="glyph-pixel" aria-hidden="true" /> EasyPrompt
          </Link>
          <p>
            Fill out a form, get a perfect prompt. The builder is free with no
            sign-up; optional Pro Boosters sharpen the output.
          </p>
        </div>

        <nav className="footer-col" aria-label="Categories">
          <h4>Browse</h4>
          {CATEGORIES.map((c) => (
            <Link key={c.id} href={`/templates?category=${c.id}`}>
              {c.label}
            </Link>
          ))}
          <Link href="/templates">All prompts</Link>
        </nav>

        <nav className="footer-col" aria-label="Product">
          <h4>Product</h4>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/submit-template">Submit a template</Link>
        </nav>

        <nav className="footer-col" aria-label="Legal">
          <h4>Legal</h4>
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/terms">Terms of service</Link>
        </nav>
      </div>

      <div className="footer-base">
        <span>© {new Date().getFullYear()} EasyPrompt</span>
        <span className="footer-free">Core builder free · No account required</span>
      </div>
    </footer>
  );
}
