import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { refresh } from "@/api/auth";
import { clientRefresh } from "@/api/clientAuth";
import { AppLayout } from "@/layouts/AppLayout";
import { ClientLayout } from "@/layouts/ClientLayout";
import { ClientProtectedRoute } from "@/layouts/ClientProtectedRoute";
import { ProtectedRoute } from "@/layouts/ProtectedRoute";
import { applyBrandColors } from "@/lib/theme";
import { AccountTypePage } from "@/pages/AccountTypePage";
import { AgendaPage } from "@/pages/agenda/AgendaPage";
import { BarberSelectPage } from "@/pages/client/BarberSelectPage";
import { BarbershopProfilePage } from "@/pages/client/BarbershopProfilePage";
import { BookingConfirmPage } from "@/pages/client/BookingConfirmPage";
import { ChatPage } from "@/pages/client/ChatPage";
import { ClientAppointmentsPage } from "@/pages/client/ClientAppointmentsPage";
import { ClientForgotPasswordPage } from "@/pages/client/ClientForgotPasswordPage";
import { ClientHomePage } from "@/pages/client/ClientHomePage";
import { ClientLoginPage } from "@/pages/client/ClientLoginPage";
import { ClientNotificationsPage } from "@/pages/client/ClientNotificationsPage";
import { ClientProfilePage } from "@/pages/client/ClientProfilePage";
import { ClientResetPasswordPage } from "@/pages/client/ClientResetPasswordPage";
import { ClientSignupPage } from "@/pages/client/ClientSignupPage";
import { DateTimePage } from "@/pages/client/DateTimePage";
import { EditProfilePage } from "@/pages/client/EditProfilePage";
import { FavoritesPage } from "@/pages/client/FavoritesPage";
import { MessagesPage } from "@/pages/client/MessagesPage";
import { QueuePage } from "@/pages/client/QueuePage";
import { SearchPage } from "@/pages/client/SearchPage";
import { ServiceSelectPage } from "@/pages/client/ServiceSelectPage";
import { CustomerProfilePage } from "@/pages/customers/CustomerProfilePage";
import { CustomersListPage } from "@/pages/customers/CustomersListPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { EmployeesListPage } from "@/pages/employees/EmployeesListPage";
import { FinancialPage } from "@/pages/financial/FinancialPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ProductDetailPage } from "@/pages/inventory/ProductDetailPage";
import { ProductsListPage } from "@/pages/inventory/ProductsListPage";
import { SuppliersListPage } from "@/pages/inventory/SuppliersListPage";
import { LoginPage } from "@/pages/LoginPage";
import { MaisPage } from "@/pages/MaisPage";
import { ConversationPage } from "@/pages/messages/ConversationPage";
import { InboxPage } from "@/pages/messages/InboxPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { QueueBoardPage } from "@/pages/queue/QueueBoardPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { ServicesListPage } from "@/pages/services/ServicesListPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { SignupPage } from "@/pages/SignupPage";
import { SplashPage } from "@/pages/SplashPage";
import { TeamListPage } from "@/pages/team/TeamListPage";
import { useAuthStore } from "@/store/authStore";
import { useClientAuthStore } from "@/store/clientAuthStore";

export function App() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const tenant = useAuthStore((state) => state.tenant);
  const isOwnerAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setClientAuth = useClientAuthStore((state) => state.setAuth);
  const isClientAuthenticated = useClientAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    // Os dois domínios de auth nunca compartilham token — tenta os dois
    // refreshes de boot em paralelo, cada um com seu próprio cookie.
    Promise.allSettled([
      refresh().then(setAuth),
      clientRefresh().then(setClientAuth),
    ]).finally(() => setBootstrapped(true));
  }, [setAuth, setClientAuth]);

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
      {/* Entrada compartilhada (splash/onboarding/escolha de conta) — só
          aparece pra quem não tem sessão válida em nenhum dos dois
          domínios; quem já está logado (dono ou cliente) pula direto. */}
      <Route
        path="/"
        element={
          isOwnerAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : isClientAuthenticated ? (
            <Navigate to="/c/inicio" replace />
          ) : (
            <SplashPage />
          )
        }
      />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/entrar-como" element={<AccountTypePage />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
      <Route path="/redefinir-senha" element={<ResetPasswordPage />} />

      <Route path="/c/entrar" element={<ClientLoginPage />} />
      <Route path="/c/cadastro" element={<ClientSignupPage />} />
      <Route path="/c/esqueci-senha" element={<ClientForgotPasswordPage />} />
      <Route path="/c/redefinir-senha" element={<ClientResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/fila" element={<QueueBoardPage />} />
          <Route path="/clientes" element={<CustomersListPage />} />
          <Route path="/clientes/:id" element={<CustomerProfilePage />} />
          <Route path="/mensagens" element={<InboxPage />} />
          <Route path="/mensagens/:conversationId" element={<ConversationPage />} />
          <Route path="/notificacoes" element={<NotificationsPage />} />
          <Route path="/servicos" element={<ServicesListPage />} />
          <Route path="/profissionais" element={<EmployeesListPage />} />
          <Route path="/equipe" element={<TeamListPage />} />
          <Route path="/estoque" element={<ProductsListPage />} />
          <Route path="/estoque/fornecedores" element={<SuppliersListPage />} />
          <Route path="/estoque/:id" element={<ProductDetailPage />} />
          <Route path="/financeiro" element={<FinancialPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="/mais" element={<MaisPage />} />
        </Route>
      </Route>

      <Route element={<ClientProtectedRoute />}>
        <Route element={<ClientLayout />}>
          <Route path="/c/inicio" element={<ClientHomePage />} />
          <Route path="/c/busca" element={<SearchPage />} />
          <Route path="/c/agendamentos" element={<ClientAppointmentsPage />} />
          <Route path="/c/mensagens" element={<MessagesPage />} />
          <Route path="/c/perfil" element={<ClientProfilePage />} />
        </Route>

        {/* Fora do shell de navegação inferior — telas de fluxo focado,
            igual ao protótipo do Figma (só topbar + voltar). */}
        <Route path="/c/barbearia/:tenantId" element={<BarbershopProfilePage />} />
        <Route path="/c/barbearia/:tenantId/barbeiro" element={<BarberSelectPage />} />
        <Route path="/c/barbearia/:tenantId/servico" element={<ServiceSelectPage />} />
        <Route path="/c/barbearia/:tenantId/horario" element={<DateTimePage />} />
        <Route path="/c/barbearia/:tenantId/confirmar" element={<BookingConfirmPage />} />
        <Route path="/c/mensagens/:conversationId" element={<ChatPage />} />
        <Route path="/c/favoritos" element={<FavoritesPage />} />
        <Route path="/c/perfil/editar" element={<EditProfilePage />} />
        <Route path="/c/notificacoes" element={<ClientNotificationsPage />} />
        <Route path="/c/barbearia/:tenantId/fila" element={<QueuePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
