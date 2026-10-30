import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/buy-auth/AuthPage";
import { meta } from "@/components/buy-auth/shared";
export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string; email?: string } => ({
    ...(typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {}),
    ...(typeof s["email"] === "string" ? { email: s["email"] } : {}),
  }),
  head: () => meta("Log in", "Log in to your OK Trade account."),
  component: Login,
});
function Login() {
  const { redirect } = Route.useSearch();
  return <AuthPage redirect={redirect} />;
}
