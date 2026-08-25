import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { completeAppointment } from "@/api/appointments";
import { listPaymentMethods } from "@/api/financial";
import { listProducts } from "@/api/inventory";
import { Modal } from "@/components/Modal";
import type { Appointment, ProductSaleItem } from "@/types/appointment";

interface CompleteModalProps {
  appointment: Appointment;
  onClose: () => void;
}

export function CompleteModal({ appointment, onClose }: CompleteModalProps) {
  const queryClient = useQueryClient();
  const [price, setPrice] = useState(appointment.price);
  const [paymentMethodCode, setPaymentMethodCode] = useState("");
  const [productsSold, setProductsSold] = useState<ProductSaleItem[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: paymentMethods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: listPaymentMethods,
  });
  const activeMethods = paymentMethods?.filter((m) => m.is_active) ?? [];

  const { data: productsPage } = useQuery({
    queryKey: ["products", { status: "active-for-select" }],
    queryFn: () => listProducts({ is_active: true, limit: 100 }),
  });

  function toggleProduct(productId: string, checked: boolean) {
    setProductsSold((prev) =>
      checked
        ? [...prev, { product_id: productId, quantity: 1 }]
        : prev.filter((p) => p.product_id !== productId),
    );
  }

  function updateQuantity(productId: string, quantity: number) {
    setProductsSold((prev) =>
      prev.map((p) => (p.product_id === productId ? { ...p, quantity } : p)),
    );
  }

  const mutation = useMutation({
    mutationFn: () =>
      completeAppointment(appointment.id, {
        price,
        payment_method_code: paymentMethodCode,
        products_sold: productsSold,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      onClose();
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Não foi possível finalizar o atendimento.";
      setServerError(message);
    },
  });

  return (
    <Modal title={`Finalizar atendimento — ${appointment.customer.full_name}`} onClose={onClose}>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-ink-300">
            Valor cobrado (R$)
          </label>
          <input
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/[0.08] bg-ink-800 px-3 py-2 text-sm text-white"
          />
        </div>

        <div>
          <label htmlFor="payment_method" className="block text-sm font-medium text-ink-300">
            Forma de pagamento
          </label>
          <select
            id="payment_method"
            value={paymentMethodCode}
            onChange={(e) => setPaymentMethodCode(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/[0.08] bg-ink-800 px-3 py-2 text-sm text-white"
          >
            <option value="">Selecione...</option>
            {activeMethods.map((m) => (
              <option key={m.id} value={m.code}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {productsPage && productsPage.items.length > 0 && (
          <div>
            <span className="block text-sm font-medium text-ink-300">Produtos vendidos (opcional)</span>
            <div className="mt-1 space-y-2">
              {productsPage.items.map((product) => {
                const sold = productsSold.find((p) => p.product_id === product.id);
                return (
                  <div key={product.id} className="flex items-center gap-2 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={Boolean(sold)}
                      onChange={(e) => toggleProduct(product.id, e.target.checked)}
                    />
                    <span className="flex-1">{product.name}</span>
                    {sold && (
                      <input
                        type="number"
                        min={1}
                        value={sold.quantity}
                        onChange={(e) => updateQuantity(product.id, Number(e.target.value))}
                        className="w-16 rounded-md border border-white/[0.08] bg-ink-800 px-2 py-1 text-sm text-white"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {serverError && <p className="text-sm text-red-400">{serverError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/[0.08] px-4 py-2 text-sm text-ink-300 hover:bg-ink-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !paymentMethodCode}
            className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink-950 hover:opacity-90 disabled:opacity-60"
          >
            {mutation.isPending ? "Salvando..." : "Finalizar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
