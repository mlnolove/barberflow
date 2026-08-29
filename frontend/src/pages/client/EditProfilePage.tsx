import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useRef, useState } from "react";
import { isAxiosError } from "axios";
import { z } from "zod";
import { Camera, Phone, User, X } from "lucide-react";

import { updateClientProfile } from "@/api/clientProfile";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthField } from "@/components/auth/AuthField";
import { ClientTopBar } from "@/components/client/ClientTopBar";
import { fileToResizedDataUrl } from "@/lib/imageResize";
import { useClientAuthStore } from "@/store/clientAuthStore";

const schema = z.object({
  full_name: z.string().min(2, "Informe o nome completo"),
  phone: z.string().optional(),
  avatar_url: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const AVATAR_MAX_SOURCE_BYTES = 12 * 1024 * 1024;

export function EditProfilePage() {
  const navigate = useNavigate();
  const client = useClientAuthStore((s) => s.client);
  const setClient = useClientAuthStore((s) => s.setClient);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: client?.full_name ?? "",
      phone: client?.phone ?? "",
      avatar_url: client?.avatar_url ?? "",
    },
  });

  const avatarUrl = watch("avatar_url");

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError(null);

    if (!file.type.startsWith("image/")) {
      setAvatarError("Escolha um arquivo de imagem.");
      return;
    }
    if (file.size > AVATAR_MAX_SOURCE_BYTES) {
      setAvatarError("Essa imagem é muito grande. Escolha uma menor.");
      return;
    }

    try {
      const resized = await fileToResizedDataUrl(file);
      setValue("avatar_url", resized, { shouldDirty: true });
    } catch {
      setAvatarError("Não foi possível processar essa foto. Tente outra.");
    }
  }

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
          <div className="flex flex-col items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="press-scale relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/[0.1] bg-ink-900"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <User size={32} className="text-ink-600" />
              )}
              <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink-950 bg-gold text-ink-950">
                <Camera size={13} strokeWidth={2.5} />
              </span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-medium text-gold"
            >
              Alterar foto
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setValue("avatar_url", "", { shouldDirty: true })}
                className="flex items-center gap-1 text-xs text-ink-500 hover:text-red-400"
              >
                <X size={11} />
                Remover foto
              </button>
            )}
            {avatarError && <p className="text-xs text-red-400">{avatarError}</p>}
          </div>

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
