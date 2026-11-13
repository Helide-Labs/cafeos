import Link from "next/link";
import PublicLayout from "./(public)/layout";
import { PageIntro } from "@/components/marketing/content";

export default function NotFound() {
  return (
    <PublicLayout>
      <PageIntro
        eyebrow="404 · PAGE NOT FOUND"
        title="This one’s off the menu."
        text="We couldn’t find that page. Head back home or open your café workspace to pick up where you left off."
      />
      <div className="m-not-found-actions">
        <Link className="m-button" href="/">Back to home</Link>
        <Link className="m-text-link" href="/app">Open workspace →</Link>
      </div>
    </PublicLayout>
  );
}
