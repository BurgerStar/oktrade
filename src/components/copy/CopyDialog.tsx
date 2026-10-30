import { useState } from "react";
import { followTrader } from "@/lib/account";
import { useAction } from "@/components/site/hooks";
import { useAccount } from "@/lib/store";
import { Modal, Field, Select, primary, input, fmt } from "@/components/investing/ui";
import type { Trader } from "./traders";
export function CopyDialog({ trader, onClose }: { trader: Trader | null; onClose: () => void }) {
  const act = useAction(),
    a = useAccount();
  const [amount, setAmount] = useState("100"),
    [mode, setMode] = useState("Fixed amount"),
    [sl, setSl] = useState("20"),
    [tp, setTp] = useState("50");
  return (
    <Modal title={`Copy ${trader?.name ?? "trader"}`} open={!!trader} onClose={onClose}>
      <Field label="Investment · USDT (minimum 50)">
        <input
          type="number"
          min="50"
          className={input}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      <p className="text-xs text-muted-foreground">
        Available {fmt(a?.balances["USDT"]?.available ?? 0)} USDT
      </p>
      <Select
        label="Copy mode"
        value={mode}
        onChange={setMode}
        options={["Fixed amount", "Ratio"]}
      />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Stop loss %">
          <input
            className={input}
            type="number"
            min="1"
            max="100"
            value={sl}
            onChange={(e) => setSl(e.target.value)}
          />
        </Field>
        <Field label="Take profit %">
          <input
            className={input}
            type="number"
            min="1"
            max="1000"
            value={tp}
            onChange={(e) => setTp(e.target.value)}
          />
        </Field>
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        Demo copying reserves USDT and simulates performance. Copy mode and exit thresholds are
        illustrative preferences only; the account engine does not persist or automatically execute
        them. Stop manually to settle simulated PnL.
      </p>
      <button
        className={primary}
        disabled={
          !Number.isFinite(Number(amount)) ||
          Number(amount) < 50 ||
          Number(sl) <= 0 ||
          Number(sl) > 100 ||
          Number(tp) <= 0 ||
          Number(tp) > 1000
        }
        onClick={() => {
          if (trader && act((s) => followTrader(s, trader.id, trader.name, Number(amount))))
            onClose();
        }}
      >
        Confirm copy
      </button>
    </Modal>
  );
}
