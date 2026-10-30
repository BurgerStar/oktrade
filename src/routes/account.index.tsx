import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAccount, update, deleteAccount } from "@/lib/store";
import {
  AccountShell,
  accountMeta,
  panel,
  primary,
  field,
} from "@/components/account/AccountShell";
import { Modal, copy } from "@/components/account/Shared";
import { toast } from "sonner";
export const Route = createFileRoute("/account/")({
  head: () => accountMeta("Profile"),
  component: Page,
});
function Page() {
  return (
    <AccountShell title="Profile">
      <Profile />
    </AccountShell>
  );
}
function Profile() {
  const a = useAccount();
  const nav = useNavigate();
  const [nickname, setNickname] = useState("");
  const [confirm, setConfirm] = useState("");
  if (!a) return null;
  return (
    <div className="space-y-7">
      <section className={`${panel} flex flex-wrap items-center gap-6`}>
        <div className="flex size-20 items-center justify-center rounded-full bg-foreground text-3xl font-semibold text-background">
          {a.user.nickname[0]?.toUpperCase()}
        </div>
        <div className="mr-auto">
          <h2 className="text-2xl font-bold tracking-tight">{a.user.nickname}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{a.user.email}</p>
        </div>
        <Modal label="Edit nickname" title="Edit nickname">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              update((s) => ({ ...s, user: { ...s.user, nickname: nickname.trim() } }));
              toast.success("Nickname updated");
            }}
          >
            <input
              required
              minLength={2}
              maxLength={32}
              className={field}
              aria-label="Nickname"
              placeholder={a.user.nickname}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <button className={primary}>Save nickname</button>
          </form>
        </Modal>
      </section>
      <section className={panel}>
        <h2 className="mb-6 text-lg font-semibold">Account details</h2>
        <dl className="grid gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">UID</dt>
            <dd className="mt-2 font-mono">
              {a.user.uid}{" "}
              <button className="ml-3 text-xs underline" onClick={() => copy(a.user.uid)}>
                Copy
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Member since</dt>
            <dd className="mt-2">{new Date(a.user.createdAt).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Email address</dt>
            <dd className="mt-2 break-all">{a.user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Referral code</dt>
            <dd className="mt-2 font-mono">
              OK Trade{a.user.uid.slice(-6)}{" "}
              <button
                className="ml-3 text-xs underline"
                onClick={() => copy(`OK Trade${a.user.uid.slice(-6)}`)}
              >
                Copy
              </button>
            </dd>
          </div>
        </dl>
      </section>
      <div className="grid gap-6 sm:grid-cols-2">
        <section className={panel}>
          <h2 className="font-semibold">Identity verification</h2>
          <p className="my-4 text-sm text-muted-foreground">
            {a.user.verified
              ? "Verified · Individual account"
              : "Not verified · Complete identity verification to unlock higher account limits."}
          </p>
          <Link to="/account/verification" className={primary}>
            {a.user.verified ? "View verification" : "Verify now"}
          </Link>
        </section>
        <section className={panel}>
          <h2 className="font-semibold">VIP level · Regular user</h2>
          <p className="my-4 text-sm text-muted-foreground">
            Spot maker 0.08% · Taker 0.10%
            <br />
            Futures maker 0.02% · Taker 0.05%
          </p>
          <Link to="/fees" className="text-sm underline">
            View fee tier table
          </Link>
        </section>
      </div>
      <section className={panel}>
        <h2 className="font-semibold">Delete account</h2>
        <p className="my-4 text-sm text-muted-foreground">
          Permanently remove this account and its local trading data. This cannot be undone.
        </p>
        <Modal label="Delete account" title="Permanently delete account?">
          <p className="text-sm text-muted-foreground">
            Type DELETE to confirm. All balances, orders and preferences associated with this
            account will be removed.
          </p>
          <input
            className={field}
            aria-label="Type DELETE"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button
            className={primary}
            disabled={confirm !== "DELETE"}
            onClick={() => {
              deleteAccount();
              toast.success("Account deleted");
              nav({ to: "/" });
            }}
          >
            Delete permanently
          </button>
        </Modal>
      </section>
    </div>
  );
}
