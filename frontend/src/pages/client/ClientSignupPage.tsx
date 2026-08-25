import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { isAxiosError } from "axios";
import { Lock, Mail, Phone, User } from "lucide-react";

import { clientSignup } from "@/api/clientAuth";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthField } from "@/components/auth/AuthField";
import { ClientTopBar } from "@/components/client/ClientTopBar";
import { useClientAuthStore } from "@/store/clientAuthStore";

const schema = z.object({
  full_name: z.string().min(2, "Informe seu nome completo"),
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  phone: z.string().optional(),
  password: z.string().min(8, "Mínimo de 8 caracteres"),
});

type FormValues = z.infer<typeof schema>;

export function ClientSignupPage() {
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
      const data = await clientSignup({
        full_name: values.full_name,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
      });
      setAuth(data);
      navigate("/c/inicio", { replace: true });
    } catch (error) {
      setServerError(
        isAxiosError(error) && error.response?.status === 409
          ? "Este e-mail já está cadastrado."
          : "Não foi possível criar sua conta. Tente novamente.",
      );
    }
  }

  return (
    <div className="flex h-screen flex-col bg-ink-950">
      <ClientTopBar />
      <div className="flex flex-1 flex-col overflow-y-auto px-6 pb-8 pt-2">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="font-serif text-2xl text-white">Criar conta</h1>
          <p className="text-sm text-ink-400">Encontre e agende em segundos.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <AuthField
            label="Nome completo"
            icon={User}
            autoComplete="name"
            placeholder="Seu nome"
            error={errors.full_name?.message}
            {...register("full_name")}
          />
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
            label="Telefone (opcional)"
            icon={Phone}
            type="tel"
            autoComplete="tel"
            placeholder="(11) 91234-5678"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <AuthField
            label="Senha"
            icon={Lock}
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            error={errors.password?.message}
            {...register("password")}
          />

          {serverError && <p className="text-sm text-red-400">{serverError}</p>}

          <AuthButton type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? "Criando conta..." : "Criar conta"}
          </AuthButton>
        </form>
      </div>
    </div>
  );
}
