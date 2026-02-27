import { createRootRoute, Outlet, Navigate, useRouterState } from "@tanstack/react-router";
import { Layout } from "@/components/layout";
import { isLoggedIn } from "@/lib/auth";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!isLoggedIn() && pathname !== "/login") {
    return <Navigate to="/login" />;
  }

  if (pathname === "/login") {
    return <Outlet />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
