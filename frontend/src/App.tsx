import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { refresh } from "@/api/auth";
import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/layouts/ProtectedRoute";
import { applyBrandColors } from "@/lib/theme";
import { AgendaPage } from "@/pages/agenda/AgendaPage";
import { CustomerProfilePage } from "@/pages/customers/CustomerProfilePage";
import { CustomersListPage } from "@/pages/customers/CustomersListPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { EmployeesListPage } from "@/pages/employees/EmployeesListPage";
import { FinancialPage } from "@/pages/financial/FinancialPage";
import { ProductDetailPage } from "@/pages/inventory/ProductDetailPage";
import { ProductsListPage } from "@/pages/inventory/ProductsListPage";
import { SuppliersListPage } from "@/pages/inventory/SuppliersListPage";
import { LoginPage } from "@/pages/LoginPage";
import { ServicesListPage } from "@/pages/services/ServicesListPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { SignupPage } from "@/pages/SignupPage";
import { useAuthStore } from "@/store/authStore";

export function App() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const tenant = useAuthStore((state) => state.tenant);

  useEffect(() => {
    refresh()
      .then(setAuth)
      .catch(() => undefined)
      .finally(() => setBootstrapped(true));
  }, [setAuth]);

  useEffect(() => {
    if (tenant) {
      applyBrandColors(tenant.primary_color, tenant.secondary_color);
    }
  }, [tenant]);

  if (!bootstrapped) {
    return null;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/clientes" element={<CustomersListPage />} />
          <Route path="/clientes/:id" element={<CustomerProfilePage />} />
          <Route path="/servicos" element={<ServicesListPage />} />
          <Route path="/profissionais" element={<EmployeesListPage />} />
          <Route path="/estoque" element={<ProductsListPage />} />
          <Route path="/estoque/fornecedores" element={<SuppliersListPage />} />
          <Route path="/estoque/:id" element={<ProductDetailPage />} />
          <Route path="/financeiro" element={<FinancialPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
