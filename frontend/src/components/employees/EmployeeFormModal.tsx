import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { createEmployee, updateEmployee } from "@/api/employees";
import { listServices } from "@/api/services";
import { Modal } from "@/components/Modal";
import type { Employee } from "@/types/employee";

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const employeeSchema = z
  .object({
    full_name: z.string().min(2, "Informe o nome completo"),
    phone: z.string().refine((v) => v.replace(/\D/g, "").length >= 10, {
      message: "Telefone inválido. Informe um número com DDD.",
    }),
    email: z.union([z.string().email("E-mail inválido"), z.literal("")]).optional(),
    role_title: z.string().optional(),
    specialties: z.string().optional(),
    commission_percentage: z
      .string()
      .refine((v) => v === "" || (Number(v) >= 0 && Number(v) <= 100), "Deve estar entre 0 e 100"),
    work_start_time: z.string().optional(),
    work_end_time: z.string().optional(),
    work_days: z.array(z.number()).default([]),
    service_ids: z.array(z.string()).default([]),
  })
  .refine(
    (data) =>
      !data.work_start_time || !data.work_end_time || data.work_end_time > data.work_start_time,
    { message: "O horário final deve ser depois do inicial.", path: ["work_end_time"] },
  );

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface EmployeeFormModalProps {
  employee?: Employee;
  onClose: () => void;
}

export function EmployeeFormModal({ employee, onClose }: EmployeeFormModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(employee);

  const { data: servicesPage } = useQuery({
    queryKey: ["services", { status: "active-for-select" }],
    queryFn: () => listServices({ is_active: true, limit: 100 }),
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      full_name: employee?.full_name ?? "",
      phone: employee?.phone ?? "",
      email: employee?.email ?? "",
      role_title: employee?.role_title ?? "",
      specialties: employee?.specialties.join(", ") ?? "",
      commission_percentage: employee?.commission_percentage ?? "0",
      work_start_time: employee?.work_start_time?.slice(0, 5) ?? "",
      work_end_time: employee?.work_end_time?.slice(0, 5) ?? "",
      work_days: employee?.work_days ?? [],
      service_ids: employee?.services.map((s) => s.id) ?? [],
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: EmployeeFormValues) => {
      const payload = {
        full_name: values.full_name,
        phone: values.phone,
        email: values.email || null,
        role_title: values.role_title || null,
        specialties: values.specialties
          ? values.specialties.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        commission_percentage: values.commission_percentage || "0",
        work_start_time: values.work_start_time ? `${values.work_start_time}:00` : null,
        work_end_time: values.work_end_time ? `${values.work_end_time}:00` : null,
        work_days: values.work_days,
        service_ids: values.service_ids,
      };
      return isEditing ? updateEmployee(employee!.id, payload) : createEmployee(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      onClose();
    },
    onError: () => {
      setServerError("Não foi possível salvar o profissional. Verifique os dados informados.");
    },
  });

  return (
    <Modal title={isEditing ? "Editar profissional" : "Novo profissional"} onClose={onClose}>
      <form
        className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        noValidate
      >
        <div>
          <label htmlFor="full_name" className="field-label">
            Nome completo
          </label>
          <input
            id="full_name"
            className="field-input"
            {...register("full_name")}
          />
          {errors.full_name && (
            <p className="field-error">{errors.full_name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="phone" className="field-label">
              Telefone
            </label>
            <input
              id="phone"
              placeholder="(11) 91234-5678"
              className="field-input"
              {...register("phone")}
            />
            {errors.phone && <p className="field-error">{errors.phone.message}</p>}
          </div>
          <div>
            <label htmlFor="role_title" className="field-label">
              Cargo (opcional)
            </label>
            <input
              id="role_title"
              placeholder="Barbeiro sênior"
              className="field-input"
              {...register("role_title")}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="field-label">
            E-mail (opcional)
          </label>
          <input
            id="email"
            type="email"
            className="field-input"
            {...register("email")}
          />
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="specialties" className="field-label">
            Especialidades (separadas por vírgula)
          </label>
          <input
            id="specialties"
            placeholder="Degradê, Barba, Coloração"
            className="field-input"
            {...register("specialties")}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="commission_percentage" className="field-label">
              Comissão (%)
            </label>
            <input
              id="commission_percentage"
              className="field-input"
              {...register("commission_percentage")}
            />
            {errors.commission_percentage && (
              <p className="field-error">{errors.commission_percentage.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="work_start_time" className="field-label">
              Início
            </label>
            <input
              id="work_start_time"
              type="time"
              className="field-input"
              {...register("work_start_time")}
            />
          </div>
          <div>
            <label htmlFor="work_end_time" className="field-label">
              Fim
            </label>
            <input
              id="work_end_time"
              type="time"
              className="field-input"
              {...register("work_end_time")}
            />
            {errors.work_end_time && (
              <p className="field-error">{errors.work_end_time.message}</p>
            )}
          </div>
        </div>

        <div>
          <span className="field-label">Dias trabalhados</span>
          <Controller
            control={control}
            name="work_days"
            render={({ field }) => (
              <div className="mt-1 flex flex-wrap gap-2">
                {WEEKDAY_LABELS.map((label, index) => {
                  const checked = field.value.includes(index);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        field.onChange(
                          checked
                            ? field.value.filter((d) => d !== index)
                            : [...field.value, index].sort(),
                        )
                      }
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                        checked
                          ? "border-gold bg-gold text-ink-950"
                          : "border-white/[0.08] text-ink-300"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          />
        </div>

        {servicesPage && servicesPage.items.length > 0 && (
          <div>
            <span className="field-label">Serviços que realiza</span>
            <Controller
              control={control}
              name="service_ids"
              render={({ field }) => (
                <div className="mt-1 space-y-1">
                  {servicesPage.items.map((service) => {
                    const checked = field.value.includes(service.id);
                    return (
                      <label key={service.id} className="flex items-center gap-2 text-sm text-white">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            field.onChange(
                              checked
                                ? field.value.filter((id) => id !== service.id)
                                : [...field.value, service.id],
                            )
                          }
                        />
                        {service.name}
                      </label>
                    );
                  })}
                </div>
              )}
            />
          </div>
        )}

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
