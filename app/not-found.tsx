import Link from "next/link";
import "./content.css";
import { CrosshairCard } from "@/components/CrosshairCard";

export default function NotFound() {
  return (
    <main className="content-page">
      <div className="content-wrap">
        <CrosshairCard className="center-card">
          <div className="big">404</div>
          <h1>This prompt wandered off.</h1>
          <p>
            The page you&apos;re after doesn&apos;t exist — but a perfect prompt is
            still 30 seconds away.
          </p>
          <Link className="btn btn-primary btn-lg" href="/templates">
            Browse prompts →
          </Link>
        </CrosshairCard>
      </div>
    </main>
  );
}
