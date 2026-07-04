import Link from "next/link";
import { BrandIcon } from "@/components/BrandIcon";
import { CATEGORIES } from "@/data/templates";

/* Global footer: category links, product links, and legal links. Built from the
   same system tokens as the app shell. */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link className="brand" href="/">
            <BrandIcon /> EasyPrompt
          </Link>
          <p>
            Browse reusable Templates and ready-to-copy Prompts. Build your own when
            the catalog does not fit.
          </p>
        </div>

        <nav className="footer-col" aria-label="Categories">
          <h4>Browse</h4>
          {CATEGORIES.map((c) => (
            <Link key={c.id} href={`/templates?category=${c.id}`}>
              {c.label}
            </Link>
          ))}
          <Link href="/templates">All templates</Link>
          <Link href="/prompts">All prompts</Link>
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
        <span>&copy; {new Date().getFullYear()} EasyPrompt</span>
        <span className="footer-free">Templates + Prompts / Core browsing free</span>
      </div>
    </footer>
  );
}
