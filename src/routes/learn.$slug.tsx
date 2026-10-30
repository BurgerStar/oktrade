import { createFileRoute } from "@tanstack/react-router";
import { ArticlePage } from "@/components/content/library";
import { meta } from "@/components/content/ui";
import { lessons as articles } from "@/components/content/articles";
export const Route = createFileRoute("/learn/$slug")({
  head: ({ params }) =>
    meta(
      articles.find((a) => a.slug === params.slug)?.title ?? "Article not found",
      "OK Trade learn: practical guidance and information.",
    ),
  component: Page,
});
function Page() {
  return <ArticlePage kind="learn" slug={Route.useParams().slug} />;
}
