import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAccount } from "@/lib/store";
import {
  getMyApprovedDepositBalances,
  getMyDepositRequests,
  submitDepositRequest,
} from "@/lib/deposits";
import { COINS } from "@/lib/coins";
import {
  AccountShell,
  accountMeta,
  panel,
  primary,
  secondary,
  field,
} from "@/components/account/AccountShell";
import { CoinSelect, networks, copy } from "@/components/account/Shared";

const BTC_RECEIVING_ADDRESS = "bc1qndlng67c66xa5c9zdwepsqmhxuzd3mustsxrs8";
const EVM_RECEIVING_ADDRESS = "0x49dDFbC79F1AE78dD74Be29A77277Ff4E8cd21e2";
const USDT_TRC20_ADDRESS = "TDtrsDZXLHUNCZT5EterdcUZcoCL9RN5LM";
const SOLANA_RECEIVING_ADDRESS = "E278aFiGAouQbuQBRPFi1BysntRb5GeNUHNiwmuPQMer";
const XRP_RECEIVING_ADDRESS = "rw7d4Tup5apDTe98UtpFYAzWkLa6meHKQo";
const DOGE_RECEIVING_ADDRESS = "DHWNuk2g9jDMnD18sZ3wjTARzhhvG1eZtx";
const depositNetworks = (ccy: string) =>
  ccy === "ETH"
    ? ["Ethereum", "X Layer"]
    : ccy === "USDT"
      ? [...networks(ccy), "BNB Smart Chain"]
      : ccy === "TRX"
        ? ["TRON"]
        : ccy === "DOGE"
          ? ["Dogecoin"]
          : networks(ccy);

export const Route = createFileRoute("/assets/deposit")({
  validateSearch: (s: Record<string, unknown>): { ccy?: string } =>
    COINS.some((c) => c.symbol === s["ccy"]) ? { ccy: String(s["ccy"]) } : {},
  head: () => accountMeta("Deposit crypto"),
  component: Page,
});
function Page() {
  const ccy = Route.useSearch().ccy ?? "USDT";
  return (
    <AccountShell title="Deposit crypto">
      <Deposit initial={ccy} key={ccy} />
    </AccountShell>
  );
}
function Deposit({ initial }: { initial: string }) {
  const a = useAccount();
  const queryClient = useQueryClient();
  const [ccy, setCcy] = useState(initial);
  const [network, setNetwork] = useState(depositNetworks(initial)[0]!);
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const requestsQuery = useQuery({
    queryKey: ["my-deposit-requests", a?.user.uid],
    queryFn: getMyDepositRequests,
    enabled: !!a,
    retry: false,
    refetchInterval: 30_000,
  });
  const balancesQuery = useQuery({
    queryKey: ["my-approved-deposit-balances", a?.user.uid],
    queryFn: getMyApprovedDepositBalances,
    enabled: !!a,
    retry: false,
    refetchInterval: 30_000,
  });
  const submitMutation = useMutation({
    mutationFn: submitDepositRequest,
    onSuccess: async () => {
      setAmount("");
      setTxHash("");
      toast.success("Deposit request submitted for review");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-deposit-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["my-approved-deposit-balances"] }),
      ]);
    },
    onError: (error) => toast.error(error.message || "Unable to submit deposit request"),
  });
  if (!a) return null;
  const isBitcoinWallet = ccy === "BTC" && network === "Bitcoin";
  const isEvmWallet =
    (ccy === "ETH" && network === "Ethereum") ||
    (ccy === "USDT" && (network === "ERC20" || network === "BNB Smart Chain"));
  const isTronWallet =
    (ccy === "USDT" && network === "TRC20") || (ccy === "TRX" && network === "TRON");
  const isSolanaWallet = ccy === "SOL" && network === "Solana";
  const isXrpWallet = ccy === "XRP" && network === "XRP Ledger";
  const isDogecoinWallet = ccy === "DOGE" && network === "Dogecoin";
  const receivingAddress = isBitcoinWallet
    ? BTC_RECEIVING_ADDRESS
    : isEvmWallet
      ? EVM_RECEIVING_ADDRESS
      : isTronWallet
        ? USDT_TRC20_ADDRESS
        : isSolanaWallet
          ? SOLANA_RECEIVING_ADDRESS
          : isXrpWallet
            ? XRP_RECEIVING_ADDRESS
            : isDogecoinWallet
              ? DOGE_RECEIVING_ADDRESS
              : null;
  const approvalServiceReady = requestsQuery.isSuccess && balancesQuery.isSuccess;
  const canDisplayAddress = !!receivingAddress && approvalServiceReady;
  const approvalServiceUnavailable = requestsQuery.isError || balancesQuery.isError;
  const min = ccy === "BTC" ? 0.0001 : ccy === "ETH" ? 0.001 : 1;
  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="space-y-7">
          <section className={panel}>
            <h2 className="mb-5 text-lg font-semibold">1. Select crypto</h2>
            <CoinSelect
              value={ccy}
              onChange={(c) => {
                setCcy(c);
                setNetwork(depositNetworks(c)[0]!);
              }}
            />
          </section>
          <section className={panel}>
            <h2 className="mb-5 text-lg font-semibold">2. Select network</h2>
            <select
              aria-label="Deposit network"
              className={field}
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
            >
              {depositNetworks(ccy).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            <div className="mt-4 flex justify-between text-xs text-muted-foreground">
              <span>
                Minimum: {min} {ccy}
              </span>
              <span>
                {!receivingAddress
                  ? "No wallet configured"
                  : approvalServiceUnavailable
                    ? "Deposit service unavailable"
                    : !approvalServiceReady
                      ? "Checking approval service"
                      : isBitcoinWallet
                        ? "3 confirmations"
                        : isEvmWallet || isTronWallet
                          ? "12 confirmations"
                          : isSolanaWallet || isXrpWallet || isDogecoinWallet
                            ? "Address configured"
                            : "No wallet configured"}
              </span>
            </div>
          </section>
          <section className={panel}>
            <h2 className="mb-5 text-lg font-semibold">3. Deposit details</h2>
            {canDisplayAddress ? (
              <>
                <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
                  Administrator {ccy} receiving address. Send {ccy} only over the {network} network.
                  On-chain deposits are not monitored or credited automatically, so your account
                  balance will not update from a transfer.
                </p>
                <p className="mb-2 text-xs text-muted-foreground">Deposit address</p>
                <p className="break-all rounded-lg bg-surface p-3 font-mono text-sm">
                  {receivingAddress}
                </p>
                <button className={`${secondary} mt-3`} onClick={() => copy(receivingAddress)}>
                  Copy {ccy} address
                </button>
              </>
            ) : receivingAddress ? (
              <p className="text-sm text-muted-foreground">
                {approvalServiceUnavailable
                  ? "Deposits are paused because the approval service is unavailable. Do not send funds."
                  : "Checking the approval service. Do not send funds until the receiving address is available."}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No receiving wallet is configured for {ccy} on {network}. Do not send funds.
              </p>
            )}
          </section>
        </div>
        <aside className="space-y-5">
          <div className={panel}>
            <h3 className="font-semibold">Before you deposit</h3>
            <ul className="mt-4 list-disc space-y-3 pl-4 text-sm leading-relaxed text-muted-foreground">
              {canDisplayAddress ? (
                <>
                  <li>
                    Only use {ccy} on the {network} network.
                  </li>
                  <li>{ccy} transfers are not detected or credited automatically in this app.</li>
                  <li>
                    Confirm the destination before sending; blockchain transfers cannot be reversed.
                  </li>
                </>
              ) : (
                <li>
                  {receivingAddress
                    ? "Deposits are paused until the approval service is ready. Do not send funds."
                    : "No receiving wallet is configured for this selection. Do not send funds."}
                </li>
              )}
            </ul>
          </div>
          {canDisplayAddress ? (
            <form
              className={panel}
              onSubmit={(e) => {
                e.preventDefault();
                submitMutation.mutate({
                  asset: ccy,
                  network,
                  amount: Number(amount),
                  txHash: txHash.trim(),
                });
              }}
            >
              <h3 className="font-semibold">Request balance credit</h3>
              <p className="my-3 text-xs leading-relaxed text-muted-foreground">
                Submit the transaction after sending. Your account balance stays unchanged until an
                administrator verifies and approves it.
              </p>
              <div className="space-y-4">
                <label className="block text-sm">
                  Amount ({ccy})
                  <input
                    className={`${field} mt-2`}
                    type="number"
                    min={min}
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Transaction ID / hash
                  <input
                    className={`${field} mt-2 font-mono`}
                    required
                    minLength={16}
                    maxLength={160}
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="Paste the on-chain transaction ID"
                  />
                </label>
              </div>
              <button className={`${primary} mt-4 w-full`} disabled={submitMutation.isPending}>
                {submitMutation.isPending ? "Submitting…" : "Submit for review"}
              </button>
            </form>
          ) : receivingAddress ? (
            <div className={`${panel} text-sm text-muted-foreground`}>
              {approvalServiceUnavailable
                ? "Deposit requests are disabled because the approval service is unavailable."
                : "Deposit requests will be available when the approval service is ready."}
            </div>
          ) : null}
        </aside>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Approved deposit balances</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Updated only after admin approval
              </p>
            </div>
          </div>
          {balancesQuery.isError ? (
            <div className={`${panel} text-sm text-muted-foreground`}>
              Deposit approval service is unavailable. No balance has been changed.
            </div>
          ) : balancesQuery.isPending ? (
            <div className={`${panel} text-sm text-muted-foreground`}>
              Loading approved balances…
            </div>
          ) : balancesQuery.data?.length ? (
            <div className={panel}>
              {balancesQuery.data.map((balance) => (
                <div
                  key={balance.asset}
                  className="flex items-center justify-between border-b border-border py-3 last:border-0"
                >
                  <span className="font-medium">{balance.asset}</span>
                  <span className="tabular">
                    {Number(balance.available).toLocaleString(undefined, {
                      maximumFractionDigits: 8,
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className={`${panel} text-sm text-muted-foreground`}>
              No deposits have been approved for this account.
            </div>
          )}
        </section>
        <section>
          <h2 className="mb-4 text-xl font-semibold">Deposit requests</h2>
          {requestsQuery.isError ? (
            <div className={`${panel} text-sm text-muted-foreground`}>
              Request history is unavailable. The approval service may need to be configured.
            </div>
          ) : requestsQuery.isPending ? (
            <div className={`${panel} text-sm text-muted-foreground`}>Loading requests…</div>
          ) : requestsQuery.data?.length ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3 font-normal">Asset / network</th>
                    <th className="p-3 font-normal">Amount</th>
                    <th className="p-3 font-normal">Status</th>
                    <th className="p-3 font-normal">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {requestsQuery.data.map((request) => (
                    <tr key={request.id} className="border-b border-border last:border-0">
                      <td className="p-3">
                        <span className="font-medium">{request.asset}</span>
                        <span className="block text-xs text-muted-foreground">
                          {request.network}
                        </span>
                      </td>
                      <td className="tabular p-3">
                        {Number(request.amount).toLocaleString(undefined, {
                          maximumFractionDigits: 8,
                        })}
                      </td>
                      <td className="p-3 capitalize">{request.status}</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`${panel} text-sm text-muted-foreground`}>No deposit requests yet.</div>
          )}
        </section>
      </div>
    </div>
  );
}
