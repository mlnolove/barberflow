import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Wallet } from "lucide-react";

import { getFinancialAccount, upsertFinancialAccount } from "@/api/financialAccount";
import type { FinancialAccountType } from "@/types/financialAccount";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FinancialAccountTab({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [accountType, setAccountType] = useState<FinancialAccountType>("PIX");
  const [holderName, setHolderName] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [agency, setAgency] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: account, isLoading } = useQuery({
    queryKey: ["settings-financial-account"],
    queryFn: getFinancialAccount,
  });

  const mutation = useMutation({
    mutationFn: () =>
      upsertFinancialAccount({
        account_type: accountType,
        holder_name: holderName,
        pix_key: accountType === "PIX" ? pixKey : null,
        bank_code: accountType === "BANK_ACCOUNT" ? bankCode : null,
        agency: accountType === "BANK_ACCOUNT" ? agency : null,
        account_number: accountType === "BANK_ACCOUNT" ? accountNumber : null,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["settings-financial-account"], updated);
      setEditing(false);
      setServerError(null);
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? (error.response?.data?.detail as string | undefined)
        : undefined;
      setServerError(message ?? "Não foi possível salvar a conta de recebimento.");
    },
  });

  function openEdit() {
    setHolderName(account?.holder_name ?? "");
    setPixKey("");
    setBankCode("");
    setAgency("");
    setAccountNumber("");
    setAccountType(account?.account_type ?? "PIX");
    setServerError(null);
    setEditing(true);
  }

  if (isLoading) {
    return <p className="text-sm text-ink-500">Carregando...</p>;
  }

  return (
    <div className="max-w-xl">
      <p className="mb-4 text-sm text-ink-500">
        Conta onde o dinheiro das assinaturas e pagamentos é recebido. Por segurança, a chave
        PIX/dados bancários nunca são reexibidos — só o nome do titular e um resumo mascarado.
      </p>

      {!editing && (
        <>
          {account ? (
            <div className="rounded-xl border border-white/[0.06] bg-ink-900 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/[0.1]">
                  <Wallet size={15} className="text-gold" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{account.holder_name}</p>
                  <p className="text-xs text-ink-500">
                    {account.account_type === "PIX" ? "PIX" : "Conta bancária"} · {account.masked_detail}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-ink-600">Atualizado em {formatDateTime(account.updated_at)}</p>
              {canEdit && (
                <button onClick={openEdit} className="btn-secondary mt-4">
                  Alterar
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/[0.1] p-6 text-center">
              <p className="text-sm text-ink-500">Nenhuma conta de recebimento cadastrada ainda.</p>
              {canEdit && (
                <button onClick={openEdit} className="btn-primary mt-4">
                  Cadastrar conta
                </button>
              )}
            </div>
          )}
        </>
      )}

      {editing && (
        <form
          className="space-y-4 rounded-xl border border-white/[0.06] bg-ink-900 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div>
            <span className="field-label">Tipo</span>
            <div className="mt-1 flex rounded-md border border-white/[0.08] text-sm">
              <button
                type="button"
                onClick={() => setAccountType("PIX")}
                className={`flex-1 rounded-l-md px-3 py-2 ${
                  accountType === "PIX" ? "bg-gold text-ink-950" : "text-ink-300"
                }`}
              >
                PIX
              </button>
              <button
                type="button"
                onClick={() => setAccountType("BANK_ACCOUNT")}
                className={`flex-1 rounded-r-md px-3 py-2 ${
                  accountType === "BANK_ACCOUNT" ? "bg-gold text-ink-950" : "text-ink-300"
                }`}
              >
                Conta bancária
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="holder_name" className="field-label">
              Nome do titular
            </label>
            <input
              id="holder_name"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              className="field-input"
            />
          </div>

          {accountType === "PIX" ? (
            <div>
              <label htmlFor="pix_key" className="field-label">
                Chave PIX
              </label>
              <input
                id="pix_key"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="CPF, e-mail, telefone ou chave aleatória"
                className="field-input"
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="bank_code" className="field-label">
                  Banco
                </label>
                <input
                  id="bank_code"
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  placeholder="001"
                  className="field-input"
                />
              </div>
              <div>
                <label htmlFor="agency" className="field-label">
                  Agência
                </label>
                <input
                  id="agency"
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                  className="field-input"
                />
              </div>
              <div>
                <label htmlFor="account_number" className="field-label">
                  Conta
                </label>
                <input
                  id="account_number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="field-input"
                />
              </div>
            </div>
          )}

          {serverError && <p className="text-sm text-red-400">{serverError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
