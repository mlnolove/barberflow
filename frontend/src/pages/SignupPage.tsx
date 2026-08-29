import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Check, Lock, Mail, Scissors, User } from "lucide-react";

import { listSignupPlans, signup } from "@/api/auth";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthField } from "@/components/auth/AuthField";
import { ClientTopBar } from "@/components/client/ClientTopBar";
import { formatMoney } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";

const BILLING_INTERVAL_LABELS: Record<string, string> = {
  MONTHLY: "mês",
  ANNUAL: "ano",
};

const signupSchema = z.object({
  tenant_name: z.string().min(2, "Informe o nome da barbearia"),
  owner_full_name: z.string().min(2, "Informe seu nome completo"),
  owner_email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  owner_password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
  plan_code: z.string().min(1, "Escolha um plano para continuar"),
});

type SignupForm = z.infer<typeof signupSchema>;

export function SignupPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: plans } = useQuery({
    queryKey: ["signup-plans"],
    queryFn: listSignupPlans,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { plan_code: "" },
  });

  const selectedPlan = watch("plan_code");

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

          <input type="hidden" {...register("plan_code")} />
          <div>
            <p className="mb-2 text-xs font-medium text-ink-400">Escolha seu plano</p>
            {!plans && <p className="text-xs text-ink-600">Carregando planos...</p>}
            <div className="flex flex-col gap-2">
              {plans?.map((plan) => {
                const isSelected = selectedPlan === plan.code;
                return (
                  <button
                    key={plan.code}
                    type="button"
                    onClick={() => setValue("plan_code", plan.code, { shouldValidate: true })}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? "border-gold bg-gold/[0.06]"
                        : "border-white/[0.08] hover:border-white/[0.16]"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{plan.name}</p>
                      <p className="mt-0.5 font-mono text-sm text-gold">
                        {formatMoney(plan.price)}
                        <span className="text-ink-500">
                          {" "}
                          / {BILLING_INTERVAL_LABELS[plan.billing_interval] ?? plan.billing_interval}
                        </span>
                      </p>
                      {plan.trial_days > 0 && (
                        <p className="mt-0.5 text-xs text-ink-500">
                          {plan.trial_days} dias grátis para testar
                        </p>
                      )}
                    </div>
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        isSelected ? "border-gold bg-gold text-ink-950" : "border-white/[0.16]"
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.plan_code && (
              <p className="mt-1.5 text-xs text-red-400">{errors.plan_code.message}</p>
            )}
          </div>

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
