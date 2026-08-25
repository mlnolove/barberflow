import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { z } from "zod";
import { CheckCircle, Lock } from "lucide-react";

import { confirmPasswordReset } from "@/api/auth";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthField } from "@/components/auth/AuthField";
import { ClientTopBar } from "@/components/client/ClientTopBar";

const schema = z
  .object({
    password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a nova senha"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    if (!token) return;
    setServerError(null);
    try {
      await confirmPasswordReset(token, values.password);
      setDone(true);
    } catch (error: unknown) {
      const message = isAxiosError(error)
        ? (error.response?.data?.detail as string | undefined)
        : undefined;
      setServerError(message ?? "Link inválido ou expirado. Peça um novo.");
    }
  }

  if (!token) {
    return (
      <div className="flex h-screen flex-col bg-ink-950">
        <ClientTopBar onBack={() => navigate("/login")} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <p className="text-sm text-ink-400">
            Link inválido. Peça um novo link de redefinição de senha.
          </p>
          <AuthButton type="button" onClick={() => navigate("/esqueci-senha")} className="mt-2">
            Pedir novo link
          </AuthButton>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex h-screen flex-col bg-ink-950">
        <ClientTopBar onBack={() => navigate("/login")} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/35 bg-gold/10">
            <CheckCircle size={28} className="text-gold" />
          </div>
          <h2 className="font-serif text-xl text-white">Senha redefinida</h2>
          <p className="text-sm leading-relaxed text-ink-400">
            Sua senha foi alterada. Já pode entrar com a nova senha.
          </p>
          <AuthButton type="button" onClick={() => navigate("/login")} className="mt-2">
            Ir para o login
          </AuthButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-ink-950">
      <ClientTopBar onBack={() => navigate("/login")} />
      <div className="flex flex-1 flex-col px-6 pb-8 pt-2">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="font-serif text-2xl text-white">Nova senha</h1>
          <p className="text-sm text-ink-400">Escolha uma nova senha para sua conta.</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <AuthField
            label="Nova senha"
            icon={Lock}
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />
          <AuthField
            label="Confirmar nova senha"
            icon={Lock}
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          {serverError && <p className="text-sm text-red-400">{serverError}</p>}
          <AuthButton type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? "Salvando..." : "Redefinir senha"}
          </AuthButton>
        </form>
      </div>
    </div>
  );
}
