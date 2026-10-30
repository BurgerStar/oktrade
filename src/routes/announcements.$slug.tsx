import { createFileRoute } from "@tanstack/react-router";
import { ArticlePage } from "@/components/content/library";
import { meta } from "@/components/content/ui";
import { announcements as articles } from "@/components/content/articles";
export const Route = createFileRoute("/announcements/$slug")({
  head: ({ params }) =>
    meta(
      articles.find((a) => a.slug === params.slug)?.title ?? "Article not found",
      "OK Trade announcements: practical guidance and information.",
    ),
  component: Page,
});
function Page() {
  return <ArticlePage kind="announcements" slug={Route.useParams().slug} />;
}
