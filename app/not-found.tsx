import Link from "next/link";
import "./content.css";
import { CrosshairCard } from "@/components/CrosshairCard";

export default function NotFound() {
  return (
    <main className="content-page">
      <div className="content-wrap">
        <CrosshairCard className="center-card">
          <div className="big">404</div>
          <h1>That page is not here.</h1>
          <p>The link may be outdated, or the page may have moved. Start again from the Template catalog.</p>
          <Link className="btn btn-primary btn-lg" href="/templates">
            Browse Templates →
          </Link>
        </CrosshairCard>
      </div>
    </main>
  );
}
