import { createFileRoute } from "@tanstack/react-router";
import { Library } from "@/components/content/library";
import { meta } from "@/components/content/ui";
export const Route = createFileRoute("/help/")({
  head: () => meta("Support center", "Explore OK Trade help articles and practical information."),
  component: () => <Library kind="help" />,
});
