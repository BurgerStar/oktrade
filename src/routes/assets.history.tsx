import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useAccount } from "@/lib/store";
import {
  AccountShell,
  accountMeta,
  secondary,
  field,
  panel,
} from "@/components/account/AccountShell";
import { ActivityTable } from "@/components/account/Shared";
import { listMyTransactionHistory } from "@/lib/transaction-approvals";
import type { Activity } from "@/lib/account";

export const Route = createFileRoute("/assets/history")({
  head: () => accountMeta("Transaction history"),
  component: Page,
});
function Page() {
  return (
    <AccountShell title="Transaction history">
      <History />
    </AccountShell>
  );
}
function History() {
  const a = useAccount();
  const historyQuery = useQuery({
    queryKey: ["my-transaction-history", a?.user.uid],
    queryFn: listMyTransactionHistory,
    enabled: !!a,
    retry: false,
    refetchInterval: 15_000,
  });
  const [type, setType] = useState("All");
  const [coin, setCoin] = useState("All");
  const [days, setDays] = useState("30");
  const [page, setPage] = useState(0);
  if (!a) return null;
  const serverItems: Activity[] = (historyQuery.data ?? []).map((request) => {
    const activity =
      typeof request.details["activity"] === "object" &&
      request.details["activity"] !== null &&
      !Array.isArray(request.details["activity"])
        ? (request.details["activity"] as Record<string, unknown>)
        : {};
    const changedOrder =
      Array.isArray(request.details["orders"]) &&
      typeof request.details["orders"][0] === "object" &&
      request.details["orders"][0] !== null &&
      !Array.isArray(request.details["orders"][0])
        ? (request.details["orders"][0] as Record<string, unknown>)
        : {};
    const changedPosition =
      Array.isArray(request.details["positions"]) &&
      typeof request.details["positions"][0] === "object" &&
      request.details["positions"][0] !== null &&
      !Array.isArray(request.details["positions"][0])
        ? (request.details["positions"][0] as Record<string, unknown>)
        : {};
    const asset =
      typeof activity["ccy"] === "string"
        ? activity["ccy"]
        : typeof request.details["asset"] === "string"
          ? request.details["asset"]
          : typeof changedOrder["instId"] === "string"
            ? (changedOrder["instId"].split("-")[0] ?? "")
            : typeof changedPosition["instId"] === "string"
              ? (changedPosition["instId"].split("-")[0] ?? "")
              : "";
    const amount =
      typeof activity["amount"] === "number"
        ? activity["amount"]
        : typeof request.details["amount"] === "number" ||
            typeof request.details["amount"] === "string"
          ? Number(request.details["amount"])
          : typeof changedOrder["size"] === "number" || typeof changedOrder["size"] === "string"
            ? Number(changedOrder["size"])
            : typeof changedPosition["size"] === "number" ||
                typeof changedPosition["size"] === "string"
              ? Number(changedPosition["size"])
              : 0;
    const chainHash =
      typeof request.details["tx_hash"] === "string" ? request.details["tx_hash"] : null;
    const activityDetail =
      typeof activity["detail"] === "string"
        ? activity["detail"]
        : chainHash
          ? `${request.summary} · Wallet transaction: ${chainHash}`
          : request.summary;
    return {
      id: request.id,
      reference: request.reference,
      type: typeof activity["type"] === "string" ? activity["type"] : request.transaction_type,
      ccy: asset,
      amount: Number.isFinite(amount) ? amount : 0,
      detail:
        request.review_note && request.status !== "pending"
          ? `${activityDetail} · Review: ${request.review_note}`
          : activityDetail,
      status: request.status,
      ts: new Date(request.created_at).getTime(),
    };
  });
  const representedActivityIds = new Set(
    (historyQuery.data ?? [])
      .map((request) => request.details["activity"])
      .filter(
        (activity): activity is Record<string, unknown> =>
          typeof activity === "object" && activity !== null && !Array.isArray(activity),
      )
      .map((activity) => activity["id"])
      .filter((id): id is string => typeof id === "string"),
  );
  const legacyItems: Activity[] = a.activity
    .filter((item) => !representedActivityIds.has(item.id))
    .map((item) => ({
      ...item,
      reference: `TX-${item.id.replaceAll("-", "").toUpperCase()}`,
    }));
  const allItems = [...serverItems, ...legacyItems].sort((left, right) => right.ts - left.ts);
  const items = allItems.filter(
    (x) =>
      (type === "All" || x.type.startsWith(type.toLowerCase().replaceAll(" ", "-"))) &&
      (coin === "All" || x.ccy === coin) &&
      (days === "All" || Date.now() - x.ts <= Number(days) * 86400000),
  );
  const pages = Math.max(1, Math.ceil(items.length / 20));
  const current = Math.min(page, pages - 1);
  function exportCsv() {
    const escape = (v: unknown) =>
      `"${String(v)
        .replace(/^[=+@-]/, "'$&")
        .replaceAll('"', '""')}"`;
    const csv = [
      ["Reference", "Date", "Type", "Asset", "Amount", "Detail", "Status"],
      ...items.map((x) => [
        x.reference ?? x.id,
        new Date(x.ts).toISOString(),
        x.type,
        x.ccy,
        x.amount,
        x.detail,
        x.status,
      ]),
    ]
      .map((r) => r.map(escape).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "onyx-transactions.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (historyQuery.isError)
    return (
      <div className={`${panel} text-sm text-muted-foreground`}>
        Server transaction history is unavailable. Try refreshing this page; pending and reviewed
        requests could not be loaded.
      </div>
    );
  if (historyQuery.isPending)
    return (
      <div className={`${panel} text-sm text-muted-foreground`}>Loading transaction history…</div>
    );
  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground">
        References are generated automatically by the system. Deposit wallet transaction hashes
        remain the original hashes from the sending network.
      </p>
      <div className="mb-6 flex flex-wrap gap-3">
        {[
          [
            "Type",
            type,
            setType,
            [
              "All",
              "Deposit",
              "Withdraw",
              "Convert",
              "Buy",
              "Sell",
              "Earn",
              "Copy",
              "Bot",
              "Reward",
              "Loan",
              "P2P",
              "Spot order",
              "Futures order",
            ],
          ],
          ["Asset", coin, setCoin, ["All", ...new Set(allItems.map((x) => x.ccy).filter(Boolean))]],
          ["Date range", days, setDays, ["7", "30", "90", "All"]],
        ].map(([label, value, set, options]) => (
          <label className="min-w-36 text-xs text-muted-foreground" key={String(label)}>
            {String(label)}
            <select
              className={`${field} mt-2`}
              value={value as string}
              onChange={(e) => {
                (set as (s: string) => void)(e.target.value);
                setPage(0);
              }}
            >
              {(options as string[]).map((o) => (
                <option key={o} value={o}>
                  {label === "Date range" && o !== "All" ? `${o} days` : o}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button className={`${secondary} ml-auto self-end`} onClick={exportCsv}>
          <Download size={16} />
          Export CSV
        </button>
      </div>
      <ActivityTable items={items.slice(current * 20, current * 20 + 20)} />
      <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {items.length} transactions · Page {current + 1} of {pages}
        </span>
        <div className="flex gap-2">
          <button className={secondary} disabled={!current} onClick={() => setPage(current - 1)}>
            Previous
          </button>
          <button
            className={secondary}
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
