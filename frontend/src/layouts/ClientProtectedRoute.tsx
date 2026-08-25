import { Navigate, Outlet } from "react-router-dom";

import { useClientAuthStore } from "@/store/clientAuthStore";

export function ClientProtectedRoute() {
  const isAuthenticated = useClientAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/c/entrar" replace />;
  }

  return <Outlet />;
}
