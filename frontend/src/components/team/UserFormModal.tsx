import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
import { z } from "zod";

import { createStaffUser, updateStaffUser } from "@/api/users";
import { Modal } from "@/components/Modal";
import { STAFF_ROLES } from "@/lib/permissions";
import type { StaffUser } from "@/types/user";

const createSchema = z.object({
  full_name: z.string().min(2, "Informe o nome completo"),
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
  phone: z.string().optional(),
  role_code: z.string().min(1, "Selecione o cargo"),
});

const editSchema = z.object({
  full_name: z.string().min(2, "Informe o nome completo"),
  phone: z.string().optional(),
  role_code: z.string().min(1, "Selecione o cargo"),
  is_active: z.boolean(),
});

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

interface UserFormModalProps {
  user?: StaffUser;
  onClose: () => void;
}

export function UserFormModal({ user, onClose }: UserFormModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(user);

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { role_code: "BARBER" },
  });
  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      full_name: user?.full_name ?? "",
      phone: user?.phone ?? "",
      role_code: user?.role.code ?? "BARBER",
      is_active: user?.is_active ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: CreateValues | EditValues) => {
      if (isEditing) {
        const v = values as EditValues;
        return updateStaffUser(user!.id, {
          full_name: v.full_name,
          phone: v.phone || null,
          role_code: v.role_code,
          is_active: v.is_active,
        });
      }
      const v = values as CreateValues;
      return createStaffUser({
        full_name: v.full_name,
        email: v.email,
        password: v.password,
        phone: v.phone || null,
        role_code: v.role_code,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-users"] });
      onClose();
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? (error.response?.data?.detail as string | undefined)
        : undefined;
      setServerError(message ?? "Não foi possível salvar o membro da equipe.");
    },
  });

  if (isEditing) {
    return (
      <Modal title="Editar membro da equipe" onClose={onClose}>
        <form
          className="space-y-4"
          onSubmit={editForm.handleSubmit((v) => mutation.mutate(v))}
          noValidate
        >
          <div>
            <label htmlFor="full_name" className="field-label">
              Nome completo
            </label>
            <input id="full_name" className="field-input" {...editForm.register("full_name")} />
            {editForm.formState.errors.full_name && (
              <p className="field-error">{editForm.formState.errors.full_name.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="phone" className="field-label">
              Telefone (opcional)
            </label>
            <input id="phone" className="field-input" {...editForm.register("phone")} />
          </div>
          <div>
            <label htmlFor="role_code" className="field-label">
              Cargo
            </label>
            <select id="role_code" className="field-input" {...editForm.register("role_code")}>
              {STAFF_ROLES.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-white">
            <input type="checkbox" {...editForm.register("is_active")} />
            Ativo (pode fazer login)
          </label>

          {serverError && <p className="text-sm text-red-400">{serverError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  return (
    <Modal title="Adicionar membro da equipe" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={createForm.handleSubmit((v) => mutation.mutate(v))}
        noValidate
      >
        <div>
          <label htmlFor="full_name" className="field-label">
            Nome completo
          </label>
          <input id="full_name" className="field-input" {...createForm.register("full_name")} />
          {createForm.formState.errors.full_name && (
            <p className="field-error">{createForm.formState.errors.full_name.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="email" className="field-label">
            E-mail
          </label>
          <input id="email" type="email" className="field-input" {...createForm.register("email")} />
          {createForm.formState.errors.email && (
            <p className="field-error">{createForm.formState.errors.email.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="password" className="field-label">
            Senha provisória
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="field-input"
            {...createForm.register("password")}
          />
          {createForm.formState.errors.password && (
            <p className="field-error">{createForm.formState.errors.password.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="phone" className="field-label">
            Telefone (opcional)
          </label>
          <input id="phone" className="field-input" {...createForm.register("phone")} />
        </div>
        <div>
          <label htmlFor="role_code" className="field-label">
            Cargo
          </label>
          <select id="role_code" className="field-input" {...createForm.register("role_code")}>
            {STAFF_ROLES.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {serverError && <p className="text-sm text-red-400">{serverError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? "Adicionando..." : "Adicionar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
