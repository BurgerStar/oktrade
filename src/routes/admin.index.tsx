import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownToLine,
  Check,
  ExternalLink,
  Search,
  Send,
  ShieldCheck,
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
import { PlanProjectionTable } from "@/components/investing/PlanProjectionTable";
import {
  getAdminOverview,
  getAdminTicketMessages,
  listAdminAudit,
  listAdminTickets,
  listAdminVisitorActivity,
  listAdminUsers,
  setAdminRole,
  setSupportTicketStatus,
  replyToSupportTicket,
  updateAdminUserStatus,
  type AdminAuditEntry,
  type AdminTicket,
  type AdminUser,
  type AdminVisitorActivity,
} from "@/lib/admin";
import {
  listAdminAccountTransactionRequests,
  reviewAccountTransaction,
  type AccountTransactionRequest,
} from "@/lib/transaction-approvals";
import {
  archiveAdminInvestmentPlan,
  createAdminInvestmentPlan,
  getInvestmentApiHost,
  InvestmentRpcError,
  listAdminInvestmentPlans,
  listAdminInvestmentRequests,
  listAdminUserInvestments,
  reviewInvestmentRequest,
  updateAdminInvestmentPlan,
  type AdminInvestmentPlan,
  type AdminInvestmentPosition,
} from "@/lib/investments";
import { formatAmount, formatNumber } from "@/lib/format";
import { getIsAdmin } from "@/lib/deposits";
import { useAccount } from "@/lib/store";

export const Route = createFileRoute("/admin/")({
  head: () => accountMeta("Admin operations"),
  component: Page,
});

type AdminView =
  "overview" | "transactions" | "users" | "visitors" | "audit" | "support" | "investment";
const VIEWS: { id: AdminView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "transactions", label: "Transaction approvals" },
  { id: "users", label: "Users" },
  { id: "visitors", label: "Visitors" },
  { id: "audit", label: "Audit log" },
  { id: "support", label: "Support" },
  { id: "investment", label: "Investment" },
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
  const [offset, setOffset] = useState(0);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const adminQuery = useQuery({
    queryKey: ["viewer-is-admin", account?.user.uid],
    queryFn: getIsAdmin,
    enabled: !!account,
    retry: false,
  });
  const overviewQuery = useQuery({
    queryKey: ["admin-overview", account?.user.uid],
    queryFn: getAdminOverview,
    enabled: !!account && adminQuery.data === true,
    retry: false,
    refetchInterval: 30_000,
  });
  const usersQuery = useQuery({
    queryKey: ["admin-users", account?.user.uid, search, status, role, offset],
    queryFn: () => listAdminUsers({ search, status, role, limit: 25, offset }),
    enabled: !!account && adminQuery.data === true && view === "users",
    retry: false,
  });
  const visitorQuery = useQuery({
    queryKey: ["admin-visitor-activity", account?.user.uid],
    queryFn: () => listAdminVisitorActivity(100),
    enabled: !!account && adminQuery.data === true && view === "visitors",
    retry: false,
    refetchInterval: 15_000,
  });
  const auditQuery = useQuery({
    queryKey: ["admin-audit", account?.user.uid],
    queryFn: () => listAdminAudit("all", 50),
    enabled: !!account && adminQuery.data === true && view === "audit",
    retry: false,
    refetchInterval: 30_000,
  });
  const transactionsQuery = useQuery({
    queryKey: ["admin-account-transactions", account?.user.uid],
    queryFn: listAdminAccountTransactionRequests,
    enabled: !!account && adminQuery.data === true && view === "transactions",
    retry: false,
    refetchInterval: 15_000,
  });
  const ticketsQuery = useQuery({
    queryKey: ["admin-tickets", account?.user.uid],
    queryFn: () => listAdminTickets(),
    enabled: !!account && adminQuery.data === true && view === "support",
    retry: false,
    refetchInterval: 30_000,
  });

  const invalidateAdmin = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-audit"] }),
    ]);
  };
  const statusMutation = useMutation({
    mutationFn: ({
      user,
      nextStatus,
      reason,
    }: {
      user: AdminUser;
      nextStatus: "active" | "suspended";
      reason: string;
    }) => updateAdminUserStatus(user.id, nextStatus, reason),
    onSuccess: async () => {
      toast.success("User status updated");
      await invalidateAdmin();
    },
    onError: (error) => toast.error(error.message || "Unable to update user status"),
  });
  const roleMutation = useMutation({
    mutationFn: ({ user, makeAdmin }: { user: AdminUser; makeAdmin: boolean }) =>
      setAdminRole(user.id, makeAdmin),
    onSuccess: async () => {
      toast.success("Administrator role updated");
      await invalidateAdmin();
    },
    onError: (error) => toast.error(error.message || "Unable to update administrator role"),
  });
  const transactionReviewMutation = useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note: string }) =>
      reviewAccountTransaction(id, approve, note),
    onSuccess: async (_data, variables) => {
      toast.success(
        variables.approve
          ? "Transaction approved and account state updated"
          : "Transaction request rejected",
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-account-transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-audit"] }),
      ]);
    },
    onError: (error) => toast.error(error.message || "Unable to review transaction"),
  });

  if (!account) return null;
  if (adminQuery.isPending)
    return <p className="text-sm text-muted-foreground">Checking administrator access…</p>;
  if (adminQuery.isError)
    return (
      <div className={`${panel} text-sm text-muted-foreground`}>
        Admin access could not be verified.
      </div>
   /* if (!adminQuery.data)
  return (
    <div className={`${panel} text-sm text-muted-foreground`}>
      Admin access could not be verified.
    </div>
  ); */

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
      <nav
        className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1"
        aria-label="Admin sections"
        role="tablist"
      >
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={view === item.id}
            className={`shrink-0 rounded-lg px-3.5 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${view === item.id ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
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
            onReview={(id, approve) =>
              transactionReviewMutation.mutate({
                id,
                approve,
                note: reasons[id] ?? "",
              })
            }
          />
        )}
        {view === "users" && (
          <UserManagement
            users={usersQuery.data ?? []}
            loading={usersQuery.isPending}
            error={usersQuery.isError}
            search={search}
            onSearch={(value) => {
              setSearch(value);
              setOffset(0);
            }}
            status={status}
            onStatusFilter={(value) => {
              setStatus(value);
              setOffset(0);
            }}
            role={role}
            onRoleFilter={(value) => {
              setRole(value);
              setOffset(0);
            }}
            offset={offset}
            onOffset={setOffset}
            reasons={reasons}
            onReason={(id, value) => setReasons((current) => ({ ...current, [id]: value }))}
            currentUserId={account.user.uid}
            statusPending={statusMutation.isPending}
            rolePending={roleMutation.isPending}
            onStatus={(user, nextStatus) =>
              statusMutation.mutate({ user, nextStatus, reason: reasons[user.id] ?? "" })
            }
            onRole={(user) => roleMutation.mutate({ user, makeAdmin: !user.is_admin })}
          />
        )}
        {view === "visitors" && (
          <VisitorActivity
            visits={visitorQuery.data ?? []}
            loading={visitorQuery.isPending}
            error={visitorQuery.isError}
          />
        )}
        {view === "audit" && (
          <AuditLog
            entries={auditQuery.data ?? []}
            loading={auditQuery.isPending}
            error={auditQuery.isError}
          />
        )}
        {view === "support" && (
          <SupportQueue
            tickets={ticketsQuery.data ?? []}
            loading={ticketsQuery.isPending}
            error={ticketsQuery.isError}
          />
        )}
        {view === "investment" && <InvestmentOperations userId={account.user.uid} />}
      </div>
    </div>
  );
}

function TransactionQueue({
  requests,
  loading,
  error,
  errorMessage,
  emptyMessage,
  notes,
  onNote,
  pending,
  onReview,
}: {
  requests: AccountTransactionRequest[];
  loading: boolean;
  error: boolean;
  errorMessage?: string;
  emptyMessage?: string;
  notes: Record<string, string>;
  onNote: (id: string, value: string) => void;
  pending: boolean;
  onReview: (id: string, approve: boolean) => void;
}) {
  if (error)
    return (
      <div className={`${panel} text-sm text-muted-foreground`}>
        {errorMessage ??
          "Transaction requests could not be loaded. Confirm the transaction approval migration is applied and your administrator role is active."}
      </div>
    );
  if (loading)
    return (
      <div className={`${panel} text-sm text-muted-foreground`}>Loading transaction requests…</div>
    );
  if (!requests.length)
    return (
      <div className={`${panel} text-sm text-muted-foreground`}>
        {emptyMessage ?? "No account transactions are awaiting or have received review."}
      </div>
    );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review the request and its server-side details before deciding. Approved changes are applied
        atomically on the server.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
            <tr>
              <th className="p-3 font-normal">User</th>
              <th className="p-3 font-normal">Transaction</th>
              <th className="p-3 font-normal">Requested change</th>
              <th className="p-3 font-normal">Submitted</th>
              <th className="p-3 font-normal">Status</th>
              <th className="p-3 font-normal">Review</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className="border-b border-border align-top last:border-0">
                <td className="max-w-48 break-all p-3">{request.email ?? request.user_id}</td>
                <td className="p-3">
                  <span className="font-medium capitalize">
                    {request.transaction_type.replaceAll("-", " ")}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{request.id}</span>
                </td>
                <td className="max-w-[30rem] p-3">
                  <p>{request.summary}</p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground">
                      Server-checked changes and submitted details
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-surface p-3 text-xs">
                      {JSON.stringify(request.details ?? {}, null, 2)}
                    </pre>
                  </details>
                </td>
                <td className="p-3 text-muted-foreground">
                  {new Date(request.created_at).toLocaleString()}
                </td>
                <td className="p-3 capitalize">{request.status}</td>
                <td className="min-w-60 p-3">
                  {request.status === "pending" ? (
                    <div className="space-y-2">
                      <input
                        className={`${field} py-2`}
                        aria-label={`Review note for ${request.id}`}
                        placeholder="Optional review note"
                        maxLength={500}
                        value={notes[request.id] ?? ""}
                        onChange={(event) => onNote(request.id, event.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          className={primary}
                          disabled={pending}
                          onClick={() => onReview(request.id, true)}
                        >
                          <Check size={15} /> Approve
                        </button>
                        <button
                          className={secondary}
                          disabled={pending}
                          onClick={() => onReview(request.id, false)}
                        >
                          <X size={15} /> Reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      <p>{request.review_note || "No review note"}</p>
                      {request.reviewed_at && (
                        <p className="mt-1">{new Date(request.reviewed_at).toLocaleString()}</p>
                      )}
                    </div>
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

function Overview({
  data,
  loading,
  error,
  onView,
}: {
  data: unknown;
  loading: boolean;
  error: boolean;
  onView: (view: AdminView) => void;
}) {
  const entries =
    data && typeof data === "object" && !Array.isArray(data)
      ? Object.entries(data as Record<string, unknown>).filter(([, value]) =>
          ["string", "number", "boolean"].includes(typeof value),
        )
      : [];
  return (
    <div className="space-y-6">
      {error ? (
        <div className={`${panel} text-sm text-muted-foreground`}>
          Overview data is unavailable.
        </div>
      ) : loading ? (
        <div className={`${panel} text-sm text-muted-foreground`}>Loading operations overview…</div>
      ) : entries.length ? (
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {entries.map(([key, value]) => (
            <div className={`${panel} min-w-0`} key={key}>
              <dt className="truncate text-xs capitalize text-muted-foreground">
                {key.replaceAll("_", " ")}
              </dt>
              <dd className="tabular mt-3 truncate text-2xl font-semibold">{String(value)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className={`${panel} text-sm text-muted-foreground`}>
          No overview metrics are configured.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Shortcut
          icon={<Users size={18} />}
          title="Users"
          detail="Search accounts and manage access."
          onClick={() => onView("users")}
        />
        <Shortcut
          icon={<Activity size={18} />}
          title="Account activity"
          detail="Review last-active timestamps and self-reported country."
          onClick={() => onView("visitors")}
        />
        <Link to="/admin/deposits" className={`${panel} flex items-center gap-4 hover:bg-accent`}>
          <ArrowDownToLine size={18} />
          <span>
            <span className="block font-medium">Deposit approvals</span>
            <span className="text-xs text-muted-foreground">
              Review requests and top up balances.
            </span>
          </span>
        </Link>
        <Link to="/earn" className={`${panel} flex items-center gap-4 hover:bg-accent`}>
          <ExternalLink size={18} />
          <span>
            <span className="block font-medium">Investment products</span>
            <span className="text-xs text-muted-foreground">
              Review and configure published terms.
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}

function Shortcut({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${panel} flex items-center gap-4 text-left transition-colors hover:bg-accent`}
      onClick={onClick}
    >
      {icon}
      <span>
        <span className="block font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{detail}</span>
      </span>
    </button>
  );
}

function UserManagement(props: {
  users: AdminUser[];
  loading: boolean;
  error: boolean;
  search: string;
  onSearch: (value: string) => void;
  status: string;
  onStatusFilter: (value: string) => void;
  role: string;
  onRoleFilter: (value: string) => void;
  offset: number;
  onOffset: (offset: number) => void;
  reasons: Record<string, string>;
  onReason: (id: string, value: string) => void;
  currentUserId: string;
  statusPending: boolean;
  rolePending: boolean;
  onStatus: (user: AdminUser, status: "active" | "suspended") => void;
  onRole: (user: AdminUser) => void;
}) {
  const total = props.users[0]?.total_count ?? 0;
  const pages = Math.max(1, Math.ceil(total / 25));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-60 flex-1 text-xs text-muted-foreground">
          Search users
          <span className="relative mt-2 block">
            <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <input
              className={`${field} pl-9`}
              value={props.search}
              onChange={(event) => props.onSearch(event.target.value)}
              placeholder="Name or email"
            />
          </span>
        </label>
        <Filter
          label="Status"
          value={props.status}
          onChange={props.onStatusFilter}
          options={["all", "active", "suspended"]}
        />
        <Filter
          label="Role"
          value={props.role}
          onChange={props.onRoleFilter}
          options={["all", "user", "admin"]}
        />
      </div>
      {props.error ? (
        <div className={`${panel} text-sm text-muted-foreground`}>
          User management is unavailable.
        </div>
      ) : props.loading ? (
        <div className={`${panel} text-sm text-muted-foreground`}>Loading users…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
              <tr>
                {[
                  "User",
                  "Status",
                  "Created",
                  "Last active",
                  "Orders",
                  "Tickets",
                  "Role controls",
                ].map((heading) => (
                  <th key={heading} className="p-3 font-normal">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.users.map((user) => (
                <tr key={user.id} className="border-b border-border align-top last:border-0">
                  <td className="max-w-56 break-all p-3">
                    <span className="font-medium">{user.display_name || user.email}</span>
                    <span className="block text-xs text-muted-foreground">{user.email}</span>
                  </td>
                  <td className="p-3 capitalize">{user.status}</td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {user.last_active ? new Date(user.last_active).toLocaleString() : "—"}
                  </td>
                  <td className="tabular p-3">{user.order_count}</td>
                  <td className="tabular p-3">{user.open_tickets}</td>
                  <td className="min-w-72 p-3">
                    <div className="space-y-2">
                      <input
                        className={`${field} py-2`}
                        aria-label={`Reason for ${user.email}`}
                        placeholder="Reason for status change"
                        value={props.reasons[user.id] ?? ""}
                        onChange={(event) => props.onReason(user.id, event.target.value)}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={secondary}
                          disabled={
                            props.statusPending ||
                            user.id === props.currentUserId ||
                            (user.status !== "suspended" &&
                              (props.reasons[user.id] ?? "").trim().length < 3)
                          }
                          onClick={() =>
                            props.onStatus(
                              user,
                              user.status === "suspended" ? "active" : "suspended",
                            )
                          }
                        >
                          {user.status === "suspended" ? "Reactivate" : "Suspend"}
                        </button>
                        <button
                          className={secondary}
                          disabled={props.rolePending || user.id === props.currentUserId}
                          onClick={() => props.onRole(user)}
                        >
                          {user.is_admin ? "Revoke admin" : "Grant admin"}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {!props.users.length && (
                <tr>
                  <td className="p-8 text-center text-muted-foreground" colSpan={7}>
                    No matching users.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-border p-3 text-sm text-muted-foreground">
            <span>
              {total} users · Page {Math.floor(props.offset / 25) + 1} of {pages}
            </span>
            <div className="flex gap-2">
              <button
                className={secondary}
                disabled={props.offset === 0}
                onClick={() => props.onOffset(Math.max(0, props.offset - 25))}
              >
                Previous
              </button>
              <button
                className={secondary}
                disabled={props.offset + 25 >= total}
                onClick={() => props.onOffset(props.offset + 25)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="min-w-36 text-xs text-muted-foreground">
      {label}
      <select
        className={`${field} mt-2 capitalize`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option className="capitalize" key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function VisitorActivity({
  visits,
  loading,
  error,
}: {
  visits: AdminVisitorActivity[];
  loading: boolean;
  error: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className={`${panel} text-sm leading-relaxed text-muted-foreground`}>
        Authenticated page activity only. Anonymous visits and IP addresses are not collected.
        Country is the visitor’s self-reported country of residence at the time of the visit.
      </div>
      {error ? (
        <div className={`${panel} text-sm text-muted-foreground`}>
          Account activity is unavailable.
        </div>
      ) : loading ? (
        <div className={`${panel} text-sm text-muted-foreground`}>Loading account activity…</div>
      ) : visits.length ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
              <tr>
                {["Account", "Country (self-reported)", "Activity", "Date and time"].map(
                  (heading) => (
                    <th key={heading} className="p-3 font-normal">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {visits.map((visit) => (
                <tr key={visit.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <span className="font-medium">{visit.display_name || visit.email}</span>
                    <span className="block text-xs text-muted-foreground">{visit.email}</span>
                  </td>
                  <td className="p-3">{visit.country_of_residence || "Not provided"}</td>
                  <td className="p-3">{visit.route_id}</td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(visit.visited_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={`${panel} text-sm text-muted-foreground`}>
          No authenticated page activity has been recorded.
        </div>
      )}
    </div>
  );
}

function AuditLog({
  entries,
  loading,
  error,
}: {
  entries: AdminAuditEntry[];
  loading: boolean;
  error: boolean;
}) {
  if (error)
    return (
      <div className={`${panel} text-sm text-muted-foreground`}>Audit history is unavailable.</div>
    );
  if (loading)
    return <div className={`${panel} text-sm text-muted-foreground`}>Loading audit history…</div>;
  if (!entries.length)
    return (
      <div className={`${panel} text-sm text-muted-foreground`}>
        No audit events have been recorded.
      </div>
    );
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[850px] text-left text-sm">
        <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
          <tr>
            {["Time", "Actor", "Action", "Entity", "Details"].map((heading) => (
              <th key={heading} className="p-3 font-normal">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-border last:border-0">
              <td className="p-3 text-muted-foreground">
                {new Date(entry.created_at).toLocaleString()}
              </td>
              <td className="p-3">{entry.actor_email}</td>
              <td className="p-3">{entry.action}</td>
              <td className="p-3">
                {entry.entity} · {entry.entity_id}
              </td>
              <td className="max-w-72 break-words p-3 font-mono text-xs">
                {JSON.stringify(entry.details)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SupportQueue({
  tickets,
  loading,
  error,
}: {
  tickets: AdminTicket[];
  loading: boolean;
  error: boolean;
}) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? tickets[0];
  const messagesQuery = useQuery({
    queryKey: ["admin-ticket-messages", selected?.id],
    queryFn: () => getAdminTicketMessages(selected!.id),
    enabled: !!selected,
    retry: false,
    refetchInterval: 5_000,
  });
  const replyMutation = useMutation({
    mutationFn: (body: string) => replyToSupportTicket(selected!.id, body),
    onSuccess: async () => {
      setReply("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-ticket-messages", selected?.id] }),
        queryClient.invalidateQueries({ queryKey: ["admin-tickets"] }),
      ]);
    },
    onError: (sendError) => toast.error(sendError.message || "Unable to send reply"),
  });
  const statusMutation = useMutation({
    mutationFn: (status: string) => setSupportTicketStatus(selected!.id, status),
    onSuccess: async () => {
      toast.success("Conversation status updated");
      await queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
    onError: (statusError) => toast.error(statusError.message || "Unable to update status"),
  });

  if (error)
    return (
      <div className={`${panel} text-sm text-muted-foreground`}>Support queue is unavailable.</div>
    );
  if (loading)
    return <div className={`${panel} text-sm text-muted-foreground`}>Loading support queue…</div>;
  if (!tickets.length)
    return <div className={`${panel} text-sm text-muted-foreground`}>No support tickets.</div>;
  return (
    <div className="grid h-[min(70vh,760px)] min-h-[520px] overflow-hidden rounded-xl border border-border bg-surface md:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="overflow-y-auto border-b border-border md:border-b-0 md:border-r">
        <div className="border-b border-border px-4 py-4">
          <h3 className="font-semibold">Conversations</h3>
          <p className="mt-1 text-xs text-muted-foreground">Updates every 5 seconds</p>
        </div>
        {tickets.map((ticket) => (
          <button
            key={ticket.id}
            type="button"
            aria-pressed={selected?.id === ticket.id}
            className={`w-full border-b border-border px-4 py-4 text-left transition-colors ${selected?.id === ticket.id ? "bg-accent" : "hover:bg-background"}`}
            onClick={() => setSelectedId(ticket.id)}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-medium">{ticket.email}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {new Date(ticket.updated_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="mt-1 truncate text-sm">{ticket.subject}</p>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">
                {ticket.category} · {ticket.message_count} messages
              </span>
              <span className="flex shrink-0 items-center gap-1.5 capitalize">
                <span
                  className={`size-2 rounded-full ${ticket.status === "open" ? "bg-up" : "bg-muted-foreground"}`}
                />
                {ticket.status}
              </span>
            </div>
          </button>
        ))}
      </aside>
      {selected ? (
        <section className="flex min-h-0 flex-col bg-grid">
          <header className="flex items-center justify-between gap-4 border-b border-border bg-background/90 px-5 py-4 backdrop-blur">
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{selected.subject}</h3>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {selected.email} · {selected.category} · {selected.priority}
              </p>
            </div>
            <label className="w-32 shrink-0 text-xs text-muted-foreground">
              Status
              <select
                className={`${field} mt-1 py-2 capitalize`}
                value={selected.status}
                onChange={(event) => statusMutation.mutate(event.target.value)}
                disabled={statusMutation.isPending}
              >
                {["open", "pending", "closed"].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {messagesQuery.isError ? (
              <p className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
                Conversation messages are unavailable. Apply the support chat migration.
              </p>
            ) : messagesQuery.isPending ? (
              <p className="text-center text-sm text-muted-foreground">Loading conversation…</p>
            ) : (
              messagesQuery.data?.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.is_staff ? "justify-end" : "justify-start"}`}
                >
                  <article
                    className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${message.is_staff ? "rounded-br-sm bg-up-muted" : "rounded-bl-sm border border-border bg-background"}`}
                  >
                    <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
                      {message.is_staff ? "Support" : selected.email}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {message.body}
                    </p>
                    <time className="mt-2 block text-right text-[10px] text-muted-foreground">
                      {new Date(message.created_at).toLocaleString()}
                    </time>
                  </article>
                </div>
              ))
            )}
          </div>
          <form
            className="flex items-end gap-3 border-t border-border bg-background p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const text = reply.trim();
              if (text) replyMutation.mutate(text);
            }}
          >
            <textarea
              className={`${field} min-h-12 max-h-36 resize-y`}
              aria-label="Reply to support conversation"
              placeholder="Write a reply…"
              maxLength={5000}
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              disabled={replyMutation.isPending}
            />
            <button
              type="submit"
              className={`${primary} size-12 shrink-0 px-0`}
              title="Send reply"
              aria-label="Send reply"
              disabled={!reply.trim() || replyMutation.isPending}
            >
              <Send size={17} />
            </button>
          </form>
        </section>
      ) : (
        <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
          Select a conversation to view messages.
        </div>
      )}
    </div>
  );
}

function InvestmentOperations({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const plansQuery = useQuery({
    queryKey: ["admin-investment-plans", userId],
    queryFn: listAdminInvestmentPlans,
    retry: false,
    refetchInterval: 30_000,
  });
  const investmentRequestsQuery = useQuery({
    queryKey: ["admin-investment-requests", userId],
    queryFn: listAdminInvestmentRequests,
    retry: false,
    refetchInterval: 15_000,
  });
  const portfolioQuery = useQuery({
    queryKey: ["admin-user-investments", userId],
    queryFn: listAdminUserInvestments,
    retry: false,
    refetchInterval: 30_000,
  });
  const refreshPlans = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-investment-plans"] }),
      queryClient.invalidateQueries({ queryKey: ["public-investment-plans"] }),
    ]);
  };
  const updateMutation = useMutation({
    mutationFn: updateAdminInvestmentPlan,
    onSuccess: async () => {
      toast.success("Investment plan settings saved");
      await refreshPlans();
    },
    onError: (error) => toast.error(error.message || "Unable to save plan settings"),
  });
  const createMutation = useMutation({
    mutationFn: createAdminInvestmentPlan,
    onSuccess: async () => {
      toast.success("Investment plan created");
      await refreshPlans();
    },
    onError: (error) => toast.error(error.message || "Unable to create investment plan"),
  });
  const archiveMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      archiveAdminInvestmentPlan(id, reason),
    onSuccess: async () => {
      toast.success("Investment plan archived");
      await refreshPlans();
    },
    onError: (error) => toast.error(error.message || "Unable to archive investment plan"),
  });
  const reviewMutation = useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note: string }) =>
      reviewInvestmentRequest(id, approve, note),
    onSuccess: async (_result, variables) => {
      toast.success(
        variables.approve ? "Investment request approved" : "Investment request rejected",
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-investment-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-user-investments"] }),
        queryClient.invalidateQueries({ queryKey: ["my-investment-portfolio"] }),
        queryClient.invalidateQueries({ queryKey: ["my-investment-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["my-account-transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["server-account-state"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-audit"] }),
      ]);
    },
    onError: (error) => toast.error(error.message || "Unable to review investment request"),
  });
  return (
    <div className="space-y-5">
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Investment requests</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Subscription approval debits available USDT. Redemption approval credits principal and
            server-calculated return. Rejections do not change balances.
          </p>
        </div>
        <TransactionQueue
          requests={investmentRequestsQuery.data ?? []}
          loading={investmentRequestsQuery.isPending}
          error={investmentRequestsQuery.isError}
          errorMessage={
            investmentRequestsQuery.error instanceof Error
              ? `Investment requests could not be loaded: ${investmentRequestsQuery.error.message}`
              : "Investment requests could not be loaded. Apply the investment management migration and verify your administrator role."
          }
          emptyMessage="No investment requests are awaiting or have received review."
          notes={reviewNotes}
          onNote={(id, value) => setReviewNotes((current) => ({ ...current, [id]: value }))}
          pending={reviewMutation.isPending}
          onReview={(id, approve) =>
            reviewMutation.mutate({
              id,
              approve,
              note: reviewNotes[id] ?? "",
            })
          }
        />
      </section>
      <div className={`${panel} flex items-start gap-4`}>
        <ShieldCheck className="mt-0.5 shrink-0" size={20} />
        <div>
          <h3 className="font-semibold">Investment product controls</h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Published plan terms are snapshotted for each approved position. Edits affect new
            subscriptions only. Accrual is capped at maturity, and principal plus return are
            credited only after redemption approval. Every plan change is audited.
          </p>
        </div>
      </div>
      {plansQuery.isError ? (
        <div className={`${panel} space-y-3 text-sm`}>
          <p className="font-medium">Plan settings are unavailable.</p>
          <p className="text-muted-foreground">
            {plansQuery.error instanceof Error
              ? plansQuery.error.message
              : "The investment-plan management RPC could not be reached."}
          </p>
          <dl className="grid gap-x-6 gap-y-2 border-y border-border py-3 text-xs sm:grid-cols-[auto_1fr]">
            <dt className="text-muted-foreground">API project</dt>
            <dd className="break-all font-mono">{getInvestmentApiHost()}</dd>
            {plansQuery.error instanceof InvestmentRpcError && (
              <>
                <dt className="text-muted-foreground">RPC</dt>
                <dd className="font-mono">{plansQuery.error.functionName}()</dd>
                {plansQuery.error.code && (
                  <>
                    <dt className="text-muted-foreground">PostgREST code</dt>
                    <dd className="font-mono">{plansQuery.error.code}</dd>
                  </>
                )}
                {plansQuery.error.details && (
                  <>
                    <dt className="text-muted-foreground">Details</dt>
                    <dd className="break-words">{plansQuery.error.details}</dd>
                  </>
                )}
                {plansQuery.error.hint && (
                  <>
                    <dt className="text-muted-foreground">Hint</dt>
                    <dd className="break-words">{plansQuery.error.hint}</dd>
                  </>
                )}
              </>
            )}
          </dl>
          <p className="text-muted-foreground">
            Verify this is the intended Supabase project. In that project, check migration history
            and apply only missing investment migrations in order. If the function already exists in
            the <code>public</code> schema, reload PostgREST’s schema cache with{" "}
            <code>NOTIFY pgrst, &apos;reload schema&apos;;</code> in the SQL Editor.
          </p>
          <button
            type="button"
            className={secondary}
            onClick={() => void plansQuery.refetch()}
            disabled={plansQuery.isFetching}
          >
            {plansQuery.isFetching ? "Retrying…" : "Retry loading plan settings"}
          </button>
        </div>
      ) : plansQuery.isPending ? (
        <div className={`${panel} text-sm text-muted-foreground`}>Loading plan settings…</div>
      ) : (
        <div className="space-y-4">
          {plansQuery.data?.some((plan) => plan.enabled && !plan.archived_at) && (
            <section className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold">Published plan projections</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Illustrative minimum and maximum deposit scenarios based on current published
                  terms.
                </p>
              </div>
              <PlanProjectionTable
                plans={plansQuery.data.filter((plan) => plan.enabled && !plan.archived_at)}
              />
            </section>
          )}
          <NewInvestmentPlanForm
            busy={createMutation.isPending}
            onCreate={(input) => createMutation.mutate(input)}
          />
          {plansQuery.data?.length ? (
            <div className="space-y-4">
              {plansQuery.data.map((plan) => (
                <InvestmentPlanEditor
                  key={plan.id}
                  plan={plan}
                  busy={updateMutation.isPending || archiveMutation.isPending}
                  onSave={(input) => updateMutation.mutate(input)}
                  onArchive={(id, reason) => archiveMutation.mutate({ id, reason })}
                />
              ))}
            </div>
          ) : (
            <div className={`${panel} text-sm text-muted-foreground`}>
              No plans are configured yet.
            </div>
          )}
        </div>
      )}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">All user investment positions</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Read-only portfolio oversight. Returns are calculated from each position’s saved plan
            terms.
          </p>
        </div>
        <AdminInvestmentPortfolio
          positions={portfolioQuery.data ?? []}
          loading={portfolioQuery.isPending}
          error={portfolioQuery.isError}
          errorMessage={
            portfolioQuery.error instanceof Error
              ? `${portfolioQuery.error.message} Verify the app is using the intended Supabase project, check its investment migration history, and reload the PostgREST schema cache if the function exists.`
              : undefined
          }
        />
      </section>
    </div>
  );
}

function NewInvestmentPlanForm({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (plan: {
    name: string;
    dailyRate: number;
    durationDays: number;
    minimumAmount: number;
    maximumAmount: number;
    bonusLabel: string;
    featured: boolean;
    enabled: boolean;
    reason: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [dailyRate, setDailyRate] = useState("1");
  const [durationDays, setDurationDays] = useState("30");
  const [minimumAmount, setMinimumAmount] = useState("100");
  const [maximumAmount, setMaximumAmount] = useState("10000");
  const [bonusLabel, setBonusLabel] = useState("");
  const [featured, setFeatured] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <form
      className={panel}
      onSubmit={(event) => {
        event.preventDefault();
        onCreate({
          name: name.trim(),
          dailyRate: Number(dailyRate),
          durationDays: Number(durationDays),
          minimumAmount: Number(minimumAmount),
          maximumAmount: Number(maximumAmount),
          bonusLabel,
          featured,
          enabled,
          reason: reason.trim(),
        });
      }}
    >
      <h3 className="mb-5 font-semibold">Create investment plan</h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <PlanField label="Plan name" value={name} onChange={setName} required maxLength={80} />
        <PlanField
          label="Daily rate (%)"
          type="number"
          min="0"
          max="100"
          step="0.0001"
          value={dailyRate}
          onChange={setDailyRate}
        />
        <PlanField
          label="Duration (days)"
          type="number"
          min="1"
          max="365"
          step="1"
          value={durationDays}
          onChange={setDurationDays}
        />
        <PlanField
          label="Minimum amount (USDT)"
          type="number"
          min="0.00000001"
          step="any"
          value={minimumAmount}
          onChange={setMinimumAmount}
        />
        <PlanField
          label="Maximum amount (USDT)"
          type="number"
          min="0.00000001"
          step="any"
          value={maximumAmount}
          onChange={setMaximumAmount}
        />
        <PlanField
          label="Bonus/details label"
          value={bonusLabel}
          onChange={setBonusLabel}
          maxLength={120}
        />
        <PlanField
          label="Change reason"
          value={reason}
          onChange={setReason}
          minLength={3}
          maxLength={500}
          required
          placeholder="Required audit reason"
        />
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={featured}
            onChange={(event) => setFeatured(event.target.checked)}
          />
          Featured plan
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Publish immediately
        </label>
      </div>
      <div className="mt-5 flex justify-end">
        <button type="submit" className={primary} disabled={busy || reason.trim().length < 3}>
          {busy ? "Creating…" : "Create plan"}
        </button>
      </div>
    </form>
  );
}

function InvestmentPlanEditor({
  plan,
  busy,
  onSave,
  onArchive,
}: {
  plan: AdminInvestmentPlan;
  busy: boolean;
  onSave: (plan: {
    id: string;
    name: string;
    dailyRate: number;
    durationDays: number;
    minimumAmount: number;
    maximumAmount: number;
    bonusLabel: string;
    featured: boolean;
    enabled: boolean;
    reason: string;
  }) => void;
  onArchive: (id: string, reason: string) => void;
}) {
  const [name, setName] = useState(plan.name);
  const [dailyRate, setDailyRate] = useState(String(plan.daily_rate));
  const [durationDays, setDurationDays] = useState(String(plan.duration_days));
  const [minimumAmount, setMinimumAmount] = useState(String(plan.minimum_amount));
  const [maximumAmount, setMaximumAmount] = useState(String(plan.maximum_amount));
  const [bonusLabel, setBonusLabel] = useState(plan.bonus_label);
  const [featured, setFeatured] = useState(plan.featured);
  const [enabled, setEnabled] = useState(plan.enabled);
  const [reason, setReason] = useState("");
  if (plan.archived_at) {
    return (
      <div className={`${panel} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <h3 className="font-semibold">{plan.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Archived {new Date(plan.archived_at).toLocaleString()} · Existing positions retain these
            terms
          </p>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs">Archived</span>
      </div>
    );
  }
  return (
    <form
      className={panel}
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          id: plan.id,
          name,
          dailyRate: Number(dailyRate),
          durationDays: Number(durationDays),
          minimumAmount: Number(minimumAmount),
          maximumAmount: Number(maximumAmount),
          bonusLabel,
          featured,
          enabled,
          reason: reason.trim(),
        });
      }}
    >
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-semibold">{plan.name}</h3>
        <span className="text-xs text-muted-foreground">
          Updated {new Date(plan.updated_at).toLocaleString()}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <PlanField label="Plan name" value={name} onChange={setName} />
        <PlanField
          label="Daily display rate (%)"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={dailyRate}
          onChange={setDailyRate}
        />
        <PlanField
          label="Duration (days)"
          type="number"
          min="1"
          max="365"
          step="1"
          value={durationDays}
          onChange={setDurationDays}
        />
        <PlanField
          label="Minimum amount (USD)"
          type="number"
          min="0"
          step="any"
          value={minimumAmount}
          onChange={setMinimumAmount}
        />
        <PlanField
          label="Maximum amount (USD)"
          type="number"
          min="0"
          step="any"
          value={maximumAmount}
          onChange={setMaximumAmount}
        />
        <PlanField label="Bonus label" value={bonusLabel} onChange={setBonusLabel} />
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={featured}
            onChange={(event) => setFeatured(event.target.checked)}
          />
          Featured plan
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Published on homepage
        </label>
        <PlanField
          label="Change reason"
          value={reason}
          onChange={setReason}
          minLength={3}
          maxLength={500}
          required
          placeholder="Required audit reason"
        />
      </div>
      <div className="mt-5 flex justify-end">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={secondary}
            disabled={busy || reason.trim().length < 3}
            onClick={() => onArchive(plan.id, reason.trim())}
          >
            Archive plan
          </button>
          <button type="submit" className={primary} disabled={busy || reason.trim().length < 3}>
            Save plan settings
          </button>
        </div>
      </div>
    </form>
  );
}

function AdminInvestmentPortfolio({
  positions,
  loading,
  error,
  errorMessage,
}: {
  positions: AdminInvestmentPosition[];
  loading: boolean;
  error: boolean;
  errorMessage?: string | undefined;
}) {
  if (loading)
    return <div className={`${panel} text-sm text-muted-foreground`}>Loading user positions…</div>;
  if (error)
    return (
      <div className={`${panel} text-sm text-muted-foreground`}>
        {errorMessage || "User investment positions could not be loaded."}
      </div>
    );
  if (!positions.length)
    return <div className={`${panel} text-sm text-muted-foreground`}>No user positions yet.</div>;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[1050px] text-left text-sm">
        <caption className="sr-only">User investment positions</caption>
        <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="p-3 font-normal">
              Investor
            </th>
            <th scope="col" className="p-3 font-normal">
              Plan / asset
            </th>
            <th scope="col" className="p-3 font-normal">
              Principal
            </th>
            <th scope="col" className="p-3 font-normal">
              Accrued return
            </th>
            <th scope="col" className="p-3 font-normal">
              Rate / term
            </th>
            <th scope="col" className="p-3 font-normal">
              Started
            </th>
            <th scope="col" className="p-3 font-normal">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => (
            <tr className="border-b border-border last:border-0" key={position.id}>
              <td className="p-3">{position.email || position.user_id}</td>
              <td className="p-3">
                {position.plan_name} · {position.asset}
              </td>
              <td className="p-3 tabular">
                {formatAmount(Number(position.principal), position.asset)}
              </td>
              <td className="p-3 tabular">
                {formatAmount(Number(position.accrued_return), position.asset)}
              </td>
              <td className="p-3">
                {formatNumber(Number(position.daily_rate), 2)}% ·{" "}
                {position.duration_days ? `${position.duration_days} days` : "Flexible"}
              </td>
              <td className="p-3">
                {Number.isNaN(Date.parse(position.started_at))
                  ? "—"
                  : new Date(position.started_at).toLocaleString()}
              </td>
              <td className="p-3 capitalize">{position.status.replaceAll("_", " ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlanField({
  label,
  value,
  onChange,
  ...inputProps
}: { label: string; value: string; onChange: (value: string) => void } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
>) {
  return (
    <label className="block text-sm">
      {label}
      <input
        className={`${field} mt-2`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...inputProps}
      />
    </label>
  );
}
