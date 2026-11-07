import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownToLine,
  Check,
  Search,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  AccountShell,
  accountMeta,
  field,
  panel,
  primary,
  secondary,
} from "@/components/account/AccountShell";
import {
  getAdminOverview,
  listAdminAudit,
  listAdminTickets,
  listAdminVisitorActivity,
  listAdminUsers,
  setAdminRole,
  updateAdminUserStatus,
  type AdminUser,
  type AdminAuditEntry,
  type AdminTicket,
  type AdminVisitorActivity,
} from "@/lib/admin";
import {
  listAdminAccountTransactionRequests,
  reviewAccountTransaction,
  type AccountTransactionRequest,
} from "@/lib/transaction-approvals";
import { useAccount } from "@/lib/store";

export const Route = createFileRoute("/admin/")({
  head: () => accountMeta("Admin operations"),
  component: Page,
});

type AdminView = "overview" | "transactions" | "users" | "visitors" | "audit" | "support";
const VIEWS: { id: AdminView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "transactions", label: "Transaction approvals" },
  { id: "users", label: "Users" },
  { id: "visitors", label: "Visitors" },
  { id: "audit", label: "Audit log" },
  { id: "support", label: "Support" },
];

function Page() {
  return (
    <AccountShell title="Admin operations">
      <AdminOperations />
    </AccountShell>
  );
}

function AdminOperations() {
  const account = useAccount();
  const queryClient = useQueryClient();
  const [view, setView] = useState<AdminView>("overview");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const overviewQuery = useQuery({
    queryKey: ["admin-overview", account?.user.uid],
    queryFn: getAdminOverview,
    enabled: !!account,
    retry: false,
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users", account?.user.uid, search, status, role],
    queryFn: () => listAdminUsers({ search, status, role, limit: 25, offset: 0 }),
    enabled: !!account && view === "users",
    retry: false,
  });

  const visitorQuery = useQuery({
    queryKey: ["admin-visitor-activity", account?.user.uid],
    queryFn: () => listAdminVisitorActivity(100),
    enabled: !!account && view === "visitors",
    retry: false,
  });

  const auditQuery = useQuery({
    queryKey: ["admin-audit", account?.user.uid, view],
    queryFn: () => listAdminAudit("all", 50),
    enabled: !!account && view === "audit",
    retry: false,
  });

  const transactionsQuery = useQuery({
    queryKey: ["admin-account-transactions", account?.user.uid],
    queryFn: listAdminAccountTransactionRequests,
    enabled: !!account && view === "transactions",
    retry: false,
  });

  const ticketsQuery = useQuery({
    queryKey: ["admin-tickets", account?.user.uid, search, status],
    queryFn: () => listAdminTickets(search, status),
    enabled: !!account && view === "support",
    retry: false,
  });

  const invalidateAdmin = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-audit"] }),
    ]);
  };

  const statusMutation = useMutation({
    mutationFn: ({ userId, nextStatus, reason }: { userId: string; nextStatus: "active" | "suspended"; reason: string }) =>
      updateAdminUserStatus(userId, nextStatus, reason),
    onSuccess: async () => {
      toast.success("User status configuration updated locally.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Unable to alter customer operational state.";
      toast.error(msg);
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) =>
      setAdminRole(userId, makeAdmin),
    onSuccess: async () => {
      toast.success("Security permission level modified.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Administrative deployment failed.";
      toast.error(msg);
    },
  });

  const transactionReviewMutation = useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note: string }) =>
      reviewAccountTransaction(id, approve, note),
    onSuccess: async () => {
      toast.success("Review ledger updated successfully.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-account-transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-overview"] }),
      ]);
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Unable to record review execution status.";
      toast.error(msg);
    },
  });

  if (!account) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Operations workspace
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Control center</h2>
        </div>
        <Link to="/admin/deposits" className={primary}>
          <ArrowDownToLine size={16} /> Deposit approvals
        </Link>
      </header>
      
      <nav className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`shrink-0 rounded-lg px-3.5 py-2.5 text-sm transition-colors ${view === item.id ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="pt-1">
        {view === "overview" && (
          <Overview
            data={overviewQuery.data}
            loading={overviewQuery.isPending}
            error={overviewQuery.isError}
            onView={setView}
          />
        )}
        {view === "transactions" && (
          <TransactionQueue
            requests={transactionsQuery.data ?? []}
            loading={transactionsQuery.isPending}
            error={transactionsQuery.isError}
            notes={reasons}
            onNote={(id, value) => setReasons((current) => ({ ...current, [id]: value }))}
            pending={transactionReviewMutation.isPending}
            onReview={(id, approve) => {
              transactionReviewMutation.mutate({ id, approve, note: reasons[id] ?? "" });
            }}
          />
        )}
        {view === "users" && (
          <UserManagement
            users={usersQuery.data ?? []}
            loading={usersQuery.isPending}
            error={usersQuery.isError}
            search={search}
            onSearch={(value) => setSearch(value)}
            status={status}
            onStatusFilter={(value) => setStatus(value)}
            role={role}
            onRoleFilter={(value) => setRole(value)}
            reasons={reasons}
            onReason={(id, value) => setReasons((current) => ({ ...current, [id]: value }))}
            statusPending={statusMutation.isPending}
            rolePending={roleMutation.isPending}
            onStatus={(user, nextStatus) =>
              statusMutation.mutate({ userId: user.id, nextStatus, reason: reasons[user.id] ?? "" })
            }
            onRole={(user) => roleMutation.mutate({ userId: user.id, makeAdmin: !user.is_admin })}
          />
        )}
        {view === "visitors" && (
          <VisitorActivity visits={visitorQuery.data ?? []} loading={visitorQuery.isPending} />
        )}
        {view === "audit" && (
          <AuditLog entries={auditQuery.data ?? []} loading={auditQuery.isPending} />
        )}
        {view === "support" && (
          <SupportQueue tickets={ticketsQuery.data ?? []} loading={ticketsQuery.isPending} />
        )}
      </div>
    </div>
  );
}

function TransactionQueue({
  requests,
  loading,
  error,
  notes,
  onNote,
  pending,
  onReview,
}: {
  requests: AccountTransactionRequest[];
  loading: boolean;
  error: boolean;
  notes: Record<string, string>;
  onNote: (id: string, value: string) => void;
  pending: boolean;
  onReview: (id: string, approve: boolean) => void;
}) {
  if (error) return <div className={`${panel} text-sm text-muted-foreground`}>Transaction requests could not be loaded.</div>;
  if (loading) return <div className={`${panel} text-sm text-muted-foreground`}>Loading transaction requests…</div>;
  if (!requests.length) return <div className={`${panel} text-sm text-muted-foreground`}>No account transactions are awaiting review.</div>;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
            <tr>
              <th className="p-3 font-normal">User</th>
              <th className="p-3 font-normal">Transaction</th>
              <th className="p-3 font-normal">Requested change</th>
              <th className="p-3 font-normal">Submitted</th>
              <th className="p-3 font-normal">Status</th>
              <th className="p-3 font-normal">Review Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className="border-b border-border align-top last:border-0">
                <td className="p-3 max-w-48 break-all">{request.email ?? request.user_id}</td>
                <td className="p-3 capitalize font-medium text-foreground">{request.transaction_type.replaceAll("_", " ")}</td>
                <td className="p-3 max-w-xs whitespace-pre-wrap">{request.summary}</td>
                <td className="p-3 text-muted-foreground">{new Date(request.created_at).toLocaleString()}</td>
                <td className="p-3">
                  <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${request.status === "approved" ? "bg-emerald-500/10 text-emerald-500" : request.status === "rejected" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}`}>
                    {request.status}
                  </span>
                </td>
                <td className="p-3 min-w-64">
                  {request.status === "pending" ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={primary}
                        disabled={pending}
                        onClick={() => onReview(request.id, true)}
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        type="button"
                        className={secondary}
                        disabled={pending}
                        onClick={() => onReview(request.id, false)}
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">{request.review_note || "Reviewed"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Overview({ data, loading, error, onView }: { data: unknown; loading: boolean; error: boolean; onView: (view: AdminView) => void }) {
  const entries = data && typeof data === "object" && !Array.isArray(data) ? Object.entries(data as Record<string, unknown>) : [];
  return (
    <div className="space-y-6">
      {error ? (
        <div className={`${panel} text-sm text-muted-foreground`}>Overview metrics are unavailable.</div>
      ) : loading ? (
        <div className={`${panel} text-sm text-muted-foreground`}>Loading metrics dashboard…</div>
      ) : (
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {entries.map(([key, value]) => (
            <div className={`${panel} min-w-0`} key={key}>
              <dt className="truncate text-xs capitalize text-muted-foreground">{key.replaceAll("_", " ")}</dt>
              <dd className="mt-3 truncate text-2xl font-semibold tracking-tight">{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Shortcut icon={<Users size={18} />} title="Users" detail="Manage accounts." onClick={() => onView("users")} />
        <Shortcut icon={<Activity size={18} />} title="Activity logs" detail="Monitor traffic." onClick={() => onView("visitors")} />
      </div>
    </div>
  );
}

function Shortcut({ icon, title, detail, onClick }: { icon: ReactNode; title: string; detail: string; onClick: () => void }) {
  return (
    <button type="button" className={`${panel} flex items-center gap-4 text-left transition-colors hover:bg-accent`} onClick={onClick}>
      {icon}
      <span>
        <span className="block font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{detail}</span>
      </span>
    </button>
  );
}

function UserManagement(props: {
  users: any[];
  loading: boolean;
  error: boolean;
  search: string;
  onSearch: (value: string) => void;
  status: string;
  onStatusFilter: (value: string) => void;
  role: string;
  onRoleFilter: (value: string) => void;
  reasons: Record<string, string>;
  onReason: (id: string, value: string) => void;
  statusPending: boolean;
  rolePending: boolean;
  onStatus: (user: any, status: "active" | "suspended") => void;
  onRole: (user: any) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-60 flex-1 text-xs text-muted-foreground">
          Search users
          <input className={`${field} mt-2`} value={props.search} onChange={(e) => props.onSearch(e.target.value)} placeholder="Name or email" />
        </label>
        <Filter label="Status" value={props.status} onChange={props.onStatusFilter} options={["all", "active", "suspended"]} />
        <Filter label="Role" value={props.role} onChange={props.onRoleFilter} options={["all", "user", "admin"]} />
      </div>
      {props.loading ? (
        <div className={`${panel} text-sm text-muted-foreground`}>Loading users…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-normal">User</th>
                <th className="p-3 font-normal">Status</th>
                <th className="p-3 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {props.users.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">{user.email}</td>
                  <td className="p-3 capitalize">{user.status || "active"}</td>
                  <td className="p-3 flex gap-2">
                    <button
                      className={secondary}
                      disabled={props.statusPending || props.rolePending}
                      onClick={() => props.onStatus(user, user.status === "suspended" ? "active" : "suspended")}
                    >
                      {user.status === "suspended" ? "Activate" : "Suspend"}
                    </button>
                    <button
                      className={primary}
                      disabled={props.statusPending || props.rolePending}
                      onClick={() => props.onRole(user)}
                    >
                      {user.is_admin ? "Demote" : "Make Admin"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="text-xs text-muted-foreground">
      {label}
      <select className={`${field} mt-2 capitalize`} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </label>
  );
}

function VisitorActivity({ visits, loading }: { visits: any[]; loading: boolean }) {
  return <div className={panel}>{loading ? "Loading visitor activities…" : "Visitor activity logging dashboard online."}</div>;
}

function AuditLog({ entries, loading }: { entries: any[]; loading: boolean }) {
  return <div className={panel}>{loading ? "Loading audit trail logs…" : "System secure audit tracing online."}</div>;
}

function SupportQueue({ tickets, loading }: { tickets: any[]; loading: boolean }) {
  return <div className={panel}>{loading ? "Loading tickets database…" : "Client communication assistance lines operational."}</div>;
}