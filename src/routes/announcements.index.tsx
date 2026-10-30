import { createFileRoute } from "@tanstack/react-router";
import { Library } from "@/components/content/library";
import { meta } from "@/components/content/ui";
export const Route = createFileRoute("/announcements/")({
  head: () =>
    meta("Announcements", "Explore OK Trade announcements articles and practical information."),
  component: () => <Library kind="announcements" />,
});
