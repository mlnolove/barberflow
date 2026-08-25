import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Lock, Mail, Scissors, User } from "lucide-react";

import { signup } from "@/api/auth";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthField } from "@/components/auth/AuthField";
import { ClientTopBar } from "@/components/client/ClientTopBar";
import { useAuthStore } from "@/store/authStore";

const signupSchema = z.object({
  tenant_name: z.string().min(2, "Informe o nome da barbearia"),
  owner_full_name: z.string().min(2, "Informe seu nome completo"),
  owner_email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  owner_password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
});

type SignupForm = z.infer<typeof signupSchema>;

export function SignupPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(values: SignupForm) {
    setServerError(null);
    try {
      const data = await signup(values);
      setAuth(data);
      navigate("/dashboard", { replace: true });
    } catch {
      setServerError("Não foi possível criar sua conta. Verifique os dados informados.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <ClientTopBar onBack={() => navigate("/entrar-como")} />
      <div className="flex flex-1 flex-col px-6 pb-8 pt-2">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="font-serif text-2xl text-white">Crie sua barbearia</h1>
          <p className="text-sm text-ink-400">Comece a usar o BarberFlow em poucos minutos.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-1 flex-col gap-4">
          <AuthField
            label="Nome da barbearia"
            icon={Scissors}
            error={errors.tenant_name?.message}
            {...register("tenant_name")}
          />
          <AuthField
            label="Seu nome completo"
            icon={User}
            error={errors.owner_full_name?.message}
            {...register("owner_full_name")}
          />
          <AuthField
            label="E-mail"
            icon={Mail}
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            error={errors.owner_email?.message}
            {...register("owner_email")}
          />
          <AuthField
            label="Senha"
            icon={Lock}
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.owner_password?.message}
            {...register("owner_password")}
          />

          {serverError && <p className="text-sm text-red-400">{serverError}</p>}

          <div className="mt-auto flex flex-col gap-3 pt-2">
            <AuthButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar conta"}
            </AuthButton>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-xs text-ink-500">ou</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
            <AuthButton type="button" variant="outline" onClick={() => navigate("/login")}>
              Já tenho uma conta
            </AuthButton>
          </div>
        </form>
      </div>
    </div>
  );
}
