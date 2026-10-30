import { createFileRoute } from "@tanstack/react-router";
import { Library } from "@/components/content/library";
import { meta } from "@/components/content/ui";
export const Route = createFileRoute("/learn/")({
  head: () => meta("Learn crypto", "Explore OK Trade learn articles and practical information."),
  component: () => <Library kind="learn" />,
});
