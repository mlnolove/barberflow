import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { isAxiosError } from "axios";

import { listPaymentMethods } from "@/api/financial";
import { completeQueueEntry } from "@/api/staffQueue";
import { Modal } from "@/components/Modal";
import { formatMoney } from "@/lib/format";
import type { StaffQueueEntry } from "@/types/staffQueue";

interface QueueCompleteModalProps {
  entry: StaffQueueEntry;
  onClose: () => void;
}

export function QueueCompleteModal({ entry, onClose }: QueueCompleteModalProps) {
  const queryClient = useQueryClient();
  const [price, setPrice] = useState(entry.service.price);
  const [paymentMethodCode, setPaymentMethodCode] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: paymentMethods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: listPaymentMethods,
  });
  const activeMethods = paymentMethods?.filter((m) => m.is_active) ?? [];

  const mutation = useMutation({
    mutationFn: () => completeQueueEntry(entry.id, { payment_method_code: paymentMethodCode, price }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      onClose();
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? (error.response?.data?.detail as string | undefined)
        : undefined;
      setServerError(message ?? "Não foi possível finalizar o atendimento.");
    },
  });

  return (
    <Modal title={`Finalizar atendimento — ${entry.customer.full_name}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label htmlFor="price" className="field-label">
            Valor cobrado (R$)
          </label>
          <input
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="field-input"
          />
          <p className="mt-1 text-xs text-ink-500">
            Preço do serviço: {formatMoney(entry.service.price)}
          </p>
        </div>

        <div>
          <label htmlFor="payment_method" className="field-label">
            Forma de pagamento
          </label>
          <select
            id="payment_method"
            value={paymentMethodCode}
            onChange={(e) => setPaymentMethodCode(e.target.value)}
            className="field-input"
          >
            <option value="">Selecione...</option>
            {activeMethods.map((m) => (
              <option key={m.id} value={m.code}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {serverError && <p className="text-sm text-red-400">{serverError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !paymentMethodCode}
            className="btn-primary"
          >
            {mutation.isPending ? "Salvando..." : "Finalizar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
