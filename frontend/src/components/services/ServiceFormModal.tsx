import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createService, updateService } from "@/api/services";
import { Modal } from "@/components/Modal";
import type { Service } from "@/types/service";

const serviceSchema = z.object({
  name: z.string().min(2, "Informe o nome do serviço"),
  description: z.string().optional(),
  price: z
    .string()
    .min(1, "Informe o preço")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Preço inválido"),
  duration_minutes: z.coerce.number().int().positive("Duração deve ser maior que zero"),
  category: z.string().optional(),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

interface ServiceFormModalProps {
  service?: Service;
  onClose: () => void;
}

export function ServiceFormModal({ service, onClose }: ServiceFormModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(service);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name ?? "",
      description: service?.description ?? "",
      price: service?.price ?? "",
      duration_minutes: service?.duration_minutes ?? 30,
      category: service?.category ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: ServiceFormValues) => {
      const payload = {
        name: values.name,
        description: values.description || null,
        price: values.price,
        duration_minutes: values.duration_minutes,
        category: values.category || null,
      };
      return isEditing ? updateService(service!.id, payload) : createService(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      onClose();
    },
    onError: () => {
      setServerError("Não foi possível salvar o serviço. Verifique os dados informados.");
    },
  });

  return (
    <Modal title={isEditing ? "Editar serviço" : "Novo serviço"} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <div>
          <label htmlFor="name" className="field-label">
            Nome
          </label>
          <input
            id="name"
            className="field-input"
            {...register("name")}
          />
          {errors.name && <p className="field-error">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="price" className="field-label">
              Preço (R$)
            </label>
            <input
              id="price"
              placeholder="40.00"
              className="field-input"
              {...register("price")}
            />
            {errors.price && <p className="field-error">{errors.price.message}</p>}
          </div>
          <div>
            <label htmlFor="duration_minutes" className="field-label">
              Duração (min)
            </label>
            <input
              id="duration_minutes"
              type="number"
              className="field-input"
              {...register("duration_minutes")}
            />
            {errors.duration_minutes && (
              <p className="field-error">{errors.duration_minutes.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="category" className="field-label">
            Categoria (opcional)
          </label>
          <input
            id="category"
            placeholder="Corte, Barba, Combo..."
            className="field-input"
            {...register("category")}
          />
        </div>

        <div>
          <label htmlFor="description" className="field-label">
            Descrição (opcional)
          </label>
          <textarea
            id="description"
            rows={3}
            className="field-input"
            {...register("description")}
          />
        </div>

        {serverError && <p className="text-sm text-red-400">{serverError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
