import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/buy-auth/AuthPage";
import { meta } from "@/components/buy-auth/shared";
export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string; email?: string } => ({
    ...(typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {}),
    ...(typeof s["email"] === "string" ? { email: s["email"] } : {}),
  }),
  head: () =>
    meta(
      "Sign up",
      "Create your OK Trade account and explore crypto.",
    ),
 component: Signup,
});

  function Signup() {
  const { redirect, email } = Route.useSearch();
  return <AuthPage signup redirect={redirect} initialEmail={email} />;
}
