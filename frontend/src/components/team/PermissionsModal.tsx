import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { setStaffUserPermission } from "@/api/users";
import { Modal } from "@/components/Modal";
import { actionLabel, PERMISSION_MODULES } from "@/lib/permissions";
import type { StaffUser } from "@/types/user";

interface PermissionsModalProps {
  user: StaffUser;
  onClose: () => void;
}

export function PermissionsModal({ user, onClose }: PermissionsModalProps) {
  const queryClient = useQueryClient();
  const [granted, setGranted] = useState(new Set(user.permissions));
  const [pending, setPending] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({ code, value }: { code: string; value: boolean }) =>
      setStaffUserPermission(user.id, code, value),
    onMutate: ({ code }) => setPending(code),
    onSuccess: (updated) => {
      setGranted(new Set(updated.permissions));
      queryClient.invalidateQueries({ queryKey: ["staff-users"] });
    },
    onSettled: () => setPending(null),
  });

  function toggle(code: string) {
    mutation.mutate({ code, value: !granted.has(code) });
  }

  return (
    <Modal title={`Permissões — ${user.full_name}`} onClose={onClose}>
      <p className="mb-4 text-sm text-ink-500">
        O cargo <span className="text-white">{user.role.name}</span> já define um conjunto padrão de
        permissões. Aqui você ajusta exceções individuais para esta pessoa.
      </p>
      <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
        {PERMISSION_MODULES.map((mod) => (
          <div key={mod.module}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">{mod.label}</p>
            <div className="flex flex-wrap gap-2">
              {mod.actions.map((action) => {
                const code = `${mod.module}.${action}`;
                const isGranted = granted.has(code);
                const isPending = pending === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggle(code)}
                    disabled={isPending}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                      isGranted
                        ? "border-gold/50 bg-gold/[0.1] text-gold"
                        : "border-white/[0.08] text-ink-400"
                    }`}
                  >
                    {isGranted && <Check size={11} strokeWidth={2.5} />}
                    {actionLabel(action)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-4">
        <button type="button" onClick={onClose} className="btn-secondary">
          Fechar
        </button>
      </div>
    </Modal>
  );
}
