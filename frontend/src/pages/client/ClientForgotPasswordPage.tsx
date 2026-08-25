import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CheckCircle, Mail } from "lucide-react";

import { requestClientPasswordReset } from "@/api/clientAuth";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthField } from "@/components/auth/AuthField";
import { ClientTopBar } from "@/components/client/ClientTopBar";

const schema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
});

type FormValues = z.infer<typeof schema>;

export function ClientForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    // O backend nunca revela se o e-mail existe — sempre 204, então a UI
    // mostra a mesma confirmação independente do resultado.
    await requestClientPasswordReset(values.email).catch(() => undefined);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex h-screen flex-col bg-ink-950">
        <ClientTopBar />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/35 bg-gold/10">
            <CheckCircle size={28} className="text-gold" />
          </div>
          <h2 className="font-serif text-xl text-white">Verifique seu e-mail</h2>
          <p className="text-sm leading-relaxed text-ink-400">
            Se houver uma conta com esse e-mail, enviamos um link para redefinir sua senha.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-ink-950">
      <ClientTopBar />
      <div className="flex flex-1 flex-col px-6 pb-8 pt-2">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="font-serif text-2xl text-white">Esqueci minha senha</h1>
          <p className="text-sm text-ink-400">
            Informe seu e-mail e enviaremos um link para redefinir sua senha.
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <AuthField
            label="E-mail"
            icon={Mail}
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <AuthButton type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? "Enviando..." : "Enviar link"}
          </AuthButton>
        </form>
      </div>
    </div>
  );
}
