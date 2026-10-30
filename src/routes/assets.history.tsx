import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";
import { useAccount } from "@/lib/store";
import { AccountShell, accountMeta, secondary, field } from "@/components/account/AccountShell";
import { ActivityTable } from "@/components/account/Shared";
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
  const [type, setType] = useState("All");
  const [coin, setCoin] = useState("All");
  const [days, setDays] = useState("30");
  const [page, setPage] = useState(0);
  if (!a) return null;
  const items = a.activity.filter(
    (x) =>
      (type === "All" || x.type.startsWith(type.toLowerCase())) &&
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
      ["ID", "Date", "Type", "Asset", "Amount", "Detail", "Status"],
      ...items.map((x) => [
        x.id,
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
  return (
    <div>
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
            ],
          ],
          ["Asset", coin, setCoin, ["All", ...new Set(a.activity.map((x) => x.ccy))]],
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
