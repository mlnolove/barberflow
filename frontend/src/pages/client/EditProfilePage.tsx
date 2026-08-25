import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
import { z } from "zod";
import { Image, Phone, User } from "lucide-react";

import { updateClientProfile } from "@/api/clientProfile";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthField } from "@/components/auth/AuthField";
import { ClientTopBar } from "@/components/client/ClientTopBar";
import { useClientAuthStore } from "@/store/clientAuthStore";

const schema = z.object({
  full_name: z.string().min(2, "Informe o nome completo"),
  phone: z.string().optional(),
  avatar_url: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function EditProfilePage() {
  const navigate = useNavigate();
  const client = useClientAuthStore((s) => s.client);
  const setClient = useClientAuthStore((s) => s.setClient);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: client?.full_name ?? "",
      phone: client?.phone ?? "",
      avatar_url: client?.avatar_url ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateClientProfile({
        full_name: values.full_name,
        phone: values.phone || null,
        avatar_url: values.avatar_url || null,
      }),
    onSuccess: (updated) => {
      setClient(updated);
      navigate("/c/perfil");
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? (error.response?.data?.detail as string | undefined)
        : undefined;
      setError("root", { message: message ?? "Não foi possível salvar. Verifique os dados." });
    },
  });

  return (
    <div className="flex h-screen flex-col bg-ink-950">
      <ClientTopBar title="Editar perfil" onBack={() => navigate("/c/perfil")} />
      <div className="flex flex-1 flex-col px-6 pb-8 pt-2">
        <form
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          noValidate
          className="flex flex-1 flex-col gap-4"
        >
          <AuthField
            label="Nome completo"
            icon={User}
            error={errors.full_name?.message}
            {...register("full_name")}
          />
          <AuthField
            label="Telefone (opcional)"
            icon={Phone}
            placeholder="(11) 91234-5678"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <AuthField
            label="URL da foto (opcional)"
            icon={Image}
            placeholder="https://..."
            error={errors.avatar_url?.message}
            {...register("avatar_url")}
          />

          {errors.root && <p className="text-sm text-red-400">{errors.root.message}</p>}

          <div className="mt-auto">
            <AuthButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </AuthButton>
          </div>
        </form>
      </div>
    </div>
  );
}
