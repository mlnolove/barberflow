import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { MapPin, Search } from "lucide-react";
import { z } from "zod";

import { updateTenantSettings } from "@/api/settings";
import { AddressMap } from "@/components/settings/AddressMap";
import { geocodeAddress } from "@/lib/geocode";
import type { Tenant } from "@/types/auth";
import { useAuthStore } from "@/store/authStore";

const infoSchema = z.object({
  name: z.string().min(2, "Informe o nome da barbearia"),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email("E-mail inválido"), z.literal("")]).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

type InfoFormValues = z.infer<typeof infoSchema>;

interface InfoTabProps {
  tenant: Tenant;
  canEdit: boolean;
}

export function InfoTab({ tenant, canEdit }: InfoTabProps) {
  const queryClient = useQueryClient();
  const setTenant = useAuthStore((state) => state.setTenant);
  const [justSaved, setJustSaved] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<InfoFormValues>({
    resolver: zodResolver(infoSchema),
    defaultValues: {
      name: tenant.name,
      description: tenant.description ?? "",
      phone: tenant.phone ?? "",
      email: tenant.email ?? "",
      address: tenant.address ?? "",
      city: tenant.city ?? "",
      latitude: tenant.latitude ?? "",
      longitude: tenant.longitude ?? "",
    },
  });

  async function markAddressOnMap() {
    const { address, city } = getValues();
    const query = [address, city].filter(Boolean).join(", ");
    if (!query.trim()) {
      setGeocodeError("Preencha o endereço (e cidade) antes de marcar no mapa.");
      return;
    }
    setGeocodeError(null);
    setGeocoding(true);
    try {
      const result = await geocodeAddress(query);
      if (!result) {
        setGeocodeError("Endereço não encontrado. Tente ajustar o texto ou marque direto no mapa.");
        return;
      }
      setValue("latitude", result.lat.toFixed(6), { shouldDirty: true });
      setValue("longitude", result.lng.toFixed(6), { shouldDirty: true });
    } catch {
      setGeocodeError("Não foi possível buscar esse endereço agora.");
    } finally {
      setGeocoding(false);
    }
  }

  function useCurrentLocation() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Geolocalização não disponível neste navegador.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("latitude", pos.coords.latitude.toFixed(6));
        setValue("longitude", pos.coords.longitude.toFixed(6));
      },
      () => setGeoError("Não foi possível obter sua localização."),
    );
  }

  const mutation = useMutation({
    mutationFn: (values: InfoFormValues) =>
      updateTenantSettings({
        name: values.name,
        description: values.description || null,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        city: values.city || null,
        latitude: values.latitude ? Number(values.latitude) : null,
        longitude: values.longitude ? Number(values.longitude) : null,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["settings-tenant"], updated);
      setTenant(updated);
      setJustSaved(true);
    },
  });

  useEffect(() => {
    if (!justSaved) return;
    const timeout = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(timeout);
  }, [justSaved]);

  return (
    <form
      className="max-w-xl space-y-4"
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      noValidate
    >
      <div>
        <label htmlFor="name" className="field-label">
          Nome da barbearia
        </label>
        <input
          id="name"
          disabled={!canEdit}
          className="field-input disabled:opacity-60"
          {...register("name")}
        />
        {errors.name && <p className="field-error">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="description" className="field-label">
          Descrição (opcional)
        </label>
        <textarea
          id="description"
          rows={3}
          disabled={!canEdit}
          placeholder="Conte um pouco sobre a barbearia — aparece no perfil público pro cliente."
          className="field-input disabled:opacity-60"
          {...register("description")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="phone" className="field-label">
            Telefone
          </label>
          <input
            id="phone"
            disabled={!canEdit}
            placeholder="(11) 98765-4321"
            className="field-input disabled:opacity-60"
            {...register("phone")}
          />
        </div>
        <div>
          <label htmlFor="email" className="field-label">
            E-mail de contato
          </label>
          <input
            id="email"
            disabled={!canEdit}
            className="field-input disabled:opacity-60"
            {...register("email")}
          />
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="address" className="field-label">
            Endereço
          </label>
          {canEdit && (
            <button
              type="button"
              onClick={markAddressOnMap}
              disabled={geocoding}
              className="flex items-center gap-1 text-xs text-gold disabled:opacity-60"
            >
              <Search size={11} />
              {geocoding ? "Buscando..." : "Marcar no mapa"}
            </button>
          )}
        </div>
        <input
          id="address"
          disabled={!canEdit}
          placeholder="Rua, número, bairro"
          className="field-input disabled:opacity-60"
          {...register("address")}
        />
        {geocodeError && <p className="field-error">{geocodeError}</p>}
      </div>

      <div>
        <label htmlFor="city" className="field-label">
          Cidade
        </label>
        <input
          id="city"
          disabled={!canEdit}
          className="field-input disabled:opacity-60"
          {...register("city")}
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="field-label">Localização (usada na busca por proximidade)</span>
          {canEdit && (
            <button
              type="button"
              onClick={useCurrentLocation}
              className="flex items-center gap-1 text-xs text-gold"
            >
              <MapPin size={11} />
              Usar minha localização atual
            </button>
          )}
        </div>
        <div className="mt-2">
          <AddressMap
            latitude={watch("latitude") ? Number(watch("latitude")) : null}
            longitude={watch("longitude") ? Number(watch("longitude")) : null}
            disabled={!canEdit}
            onChange={(lat, lng) => {
              setValue("latitude", lat.toFixed(6), { shouldDirty: true });
              setValue("longitude", lng.toFixed(6), { shouldDirty: true });
            }}
          />
          <p className="mt-1.5 text-xs text-ink-600">
            Clique no mapa ou arraste o pino pra ajustar. Mapa © OpenStreetMap.
          </p>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <input
            disabled={!canEdit}
            placeholder="Latitude"
            className="field-input mt-0 disabled:opacity-60"
            {...register("latitude")}
          />
          <input
            disabled={!canEdit}
            placeholder="Longitude"
            className="field-input mt-0 disabled:opacity-60"
            {...register("longitude")}
          />
        </div>
        {geoError && <p className="field-error">{geoError}</p>}
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-400">Não foi possível salvar. Verifique os dados informados.</p>
      )}

      {canEdit && (
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? "Salvando..." : "Salvar"}
          </button>
          {justSaved && <span className="text-sm text-emerald-400">Salvo!</span>}
        </div>
      )}
    </form>
  );
}
