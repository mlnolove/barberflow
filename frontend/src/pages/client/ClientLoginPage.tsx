import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Lock, Mail } from "lucide-react";

import { clientLogin } from "@/api/clientAuth";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthField } from "@/components/auth/AuthField";
import { ClientTopBar } from "@/components/client/ClientTopBar";
import { useClientAuthStore } from "@/store/clientAuthStore";

const schema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

type FormValues = z.infer<typeof schema>;

export function ClientLoginPage() {
  const navigate = useNavigate();
  const setAuth = useClientAuthStore((state) => state.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const data = await clientLogin(values);
      setAuth(data);
      navigate("/c/inicio", { replace: true });
    } catch {
      setServerError("Não foi possível entrar. Verifique seus dados e tente novamente.");
    }
  }

  return (
    <div className="flex h-screen flex-col bg-ink-950">
      <ClientTopBar onBack={() => navigate("/entrar-como")} />
      <div className="flex flex-1 flex-col px-6 pb-8 pt-2">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="font-serif text-2xl text-white">Entrar</h1>
          <p className="text-sm text-ink-400">Acesse sua conta para agendar.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-1 flex-col gap-4">
          <AuthField
            label="E-mail"
            icon={Mail}
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <AuthField
            label="Senha"
            icon={Lock}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="flex justify-end">
            <Link to="/c/esqueci-senha" className="text-xs text-gold">
              Esqueci minha senha
            </Link>
          </div>

          {serverError && <p className="text-sm text-red-400">{serverError}</p>}

          <div className="mt-auto flex flex-col gap-3">
            <AuthButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Entrando..." : "Entrar"}
            </AuthButton>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-xs text-ink-500">ou</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
            <AuthButton type="button" variant="outline" onClick={() => navigate("/c/cadastro")}>
              Criar conta
            </AuthButton>
          </div>
        </form>
      </div>
    </div>
  );
}
