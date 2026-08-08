import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { signup } from "@/api/auth";
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
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-brand dark:text-white">Crie sua barbearia</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Comece a usar o BarberFlow em poucos minutos.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label htmlFor="tenant_name" className="block text-sm font-medium">
              Nome da barbearia
            </label>
            <input
              id="tenant_name"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-secondary focus:outline-none focus:ring-1 focus:ring-brand-secondary dark:border-slate-700 dark:bg-slate-800"
              {...register("tenant_name")}
            />
            {errors.tenant_name && (
              <p className="mt-1 text-xs text-red-600">{errors.tenant_name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="owner_full_name" className="block text-sm font-medium">
              Seu nome completo
            </label>
            <input
              id="owner_full_name"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-secondary focus:outline-none focus:ring-1 focus:ring-brand-secondary dark:border-slate-700 dark:bg-slate-800"
              {...register("owner_full_name")}
            />
            {errors.owner_full_name && (
              <p className="mt-1 text-xs text-red-600">{errors.owner_full_name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="owner_email" className="block text-sm font-medium">
              E-mail
            </label>
            <input
              id="owner_email"
              type="email"
              autoComplete="email"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-secondary focus:outline-none focus:ring-1 focus:ring-brand-secondary dark:border-slate-700 dark:bg-slate-800"
              {...register("owner_email")}
            />
            {errors.owner_email && (
              <p className="mt-1 text-xs text-red-600">{errors.owner_email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="owner_password" className="block text-sm font-medium">
              Senha
            </label>
            <input
              id="owner_password"
              type="password"
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-secondary focus:outline-none focus:ring-1 focus:ring-brand-secondary dark:border-slate-700 dark:bg-slate-800"
              {...register("owner_password")}
            />
            {errors.owner_password && (
              <p className="mt-1 text-xs text-red-600">{errors.owner_password.message}</p>
            )}
          </div>

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Já tem uma conta?{" "}
          <Link to="/login" className="font-medium text-brand-secondary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
