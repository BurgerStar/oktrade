import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowDownToLine, Check, Users, X } from "lucide-react";
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
  getAdminTicketMessages,
  listAdminAudit,
  listAdminTickets,
  listAdminVisitorActivity,
  listAdminUsers,
  replyToSupportTicket,
  searchAdminUsers,
  setAdminRole,
  setSupportTicketStatus,
  updateAdminUserStatus,
  type AdminUser,
  type AdminAuditEntry,
  type AdminTicket,
  type AdminVisitorActivity,
} from "@/lib/admin";
import { listAdminUserInvestmentPositions, type AdminInvestmentPosition } from "@/lib/investments";
import { getIsAdmin } from "@/lib/deposits";
import {
  listAdminAccountTransactionRequests,
  reviewAccountTransaction,
  type AccountTransactionRequest,
} from "@/lib/transaction-approvals";
import { useAccount } from "@/lib/store";
import { sendAdminTransactionalEmail } from "@/lib/email-notifications";

export const Route = createFileRoute("/admin/")({
  head: () => accountMeta("Admin operations"),
  component: Page,
});

type AdminView =
  "overview" | "transactions" | "investments" | "users" | "visitors" | "audit" | "support";
const VIEWS: { id: AdminView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "transactions", label: "Transaction approvals" },
  { id: "investments", label: "Investments" },
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
  const adminAccess = useQuery({
    queryKey: ["viewer-is-admin", account?.user.uid],
    queryFn: getIsAdmin,
    enabled: !!account,
    retry: false,
  });
  const [view, setView] = useState<AdminView>("overview");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketStatus, setTicketStatus] = useState("all");
  const [investmentSearch, setInvestmentSearch] = useState("");
  const [investmentUser, setInvestmentUser] = useState<AdminUser | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const overviewQuery = useQuery({
    queryKey: ["admin-overview", account?.user.uid],
    queryFn: getAdminOverview,
    enabled: !!account && adminAccess.data === true,
    retry: false,
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users", account?.user.uid, search, status, role],
    queryFn: () => listAdminUsers({ search, status, role, limit: 25, offset: 0 }),
    enabled: !!account && adminAccess.data === true && view === "users",
    retry: false,
  });

  const visitorQuery = useQuery({
    queryKey: ["admin-visitor-activity", account?.user.uid],
    queryFn: () => listAdminVisitorActivity(100),
    enabled: !!account && adminAccess.data === true && view === "visitors",
    retry: false,
  });

  const auditQuery = useQuery({
    queryKey: ["admin-audit", account?.user.uid, view],
    queryFn: () => listAdminAudit("all", 50),
    enabled: !!account && adminAccess.data === true && view === "audit",
    retry: false,
  });

  const transactionsQuery = useQuery({
    queryKey: ["admin-account-transactions", account?.user.uid],
    queryFn: listAdminAccountTransactionRequests,
    enabled: !!account && adminAccess.data === true && view === "transactions",
    retry: false,
  });

  const ticketsQuery = useQuery({
    queryKey: ["admin-tickets", account?.user.uid, ticketSearch, ticketStatus],
    queryFn: () => listAdminTickets(ticketSearch, ticketStatus),
    enabled: !!account && adminAccess.data === true && view === "support",
    retry: false,
  });

  const investmentUsersQuery = useQuery({
    queryKey: ["admin-investment-user-search", account?.user.uid, investmentSearch.trim()],
    queryFn: () => searchAdminUsers(investmentSearch),
    enabled:
      !!account &&
      adminAccess.data === true &&
      view === "investments" &&
      investmentSearch.trim().length >= 2,
    retry: false,
  });

  const investmentPositionsQuery = useQuery({
    queryKey: ["admin-investments", account?.user.uid, investmentUser?.id],
    queryFn: () => {
      if (!investmentUser) throw new Error("Select a user to view investment positions.");
      return listAdminUserInvestmentPositions(investmentUser.id);
    },
    enabled: !!account && adminAccess.data === true && view === "investments" && !!investmentUser,
    retry: false,
  });

  const statusMutation = useMutation({
    mutationFn: ({
      userId,
      nextStatus,
      reason,
    }: {
      userId: string;
      nextStatus: "active" | "suspended";
      reason: string;
    }) => updateAdminUserStatus(userId, nextStatus, reason),
    onSuccess: async () => {
      toast.success("User access status updated.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: unknown) => {
      const msg =
        error instanceof Error ? error.message : "Unable to alter customer operational state.";
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
    mutationFn: ({
      request,
      approve,
      note,
    }: {
      request: AccountTransactionRequest;
      approve: boolean;
      note: string;
    }) => reviewAccountTransaction(request.id, approve, note),
    onSuccess: async (_data, { request, approve, note }) => {
      const resultMessage = "Review ledger updated successfully.";
      try {
        if (!request.user_id || !request.email) {
          throw new Error("The user's email address is unavailable.");
        }
        await sendAdminTransactionalEmail({
          type: "transaction-review",
          userId: request.user_id,
          email: request.email,
          status: approve ? "approved" : "rejected",
          summary: request.summary,
          note,
        });
        toast.success(`${resultMessage} Email notification sent.`);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Email delivery failed.";
        toast.error(`${resultMessage} Email notification was not sent: ${reason}`);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-account-transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-overview"] }),
      ]);
    },
    onError: (error: unknown) => {
      const msg =
        error instanceof Error ? error.message : "Unable to record review execution status.";
      toast.error(msg);
    },
  });

  if (!account) return null;
  if (adminAccess.isPending)
    return <p className="text-sm text-muted-foreground">Checking administrator access…</p>;
  if (adminAccess.isError)
    return (
      <div className={`${panel} text-sm text-muted-foreground`}>
        Administrator access could not be verified.{" "}
        <button className="underline" onClick={() => void adminAccess.refetch()}>
          Retry
        </button>
      </div>
    );
  if (!adminAccess.data)
    return (
      <div className={`${panel} text-sm text-muted-foreground`}>
        You don’t have permission to access the operations workspace.
      </div>
    );

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
            onRetry={() => void overviewQuery.refetch()}
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
            onRetry={() => void transactionsQuery.refetch()}
            onReview={(request, approve) => {
              transactionReviewMutation.mutate({
                request,
                approve,
                note: reasons[request.id] ?? "",
              });
            }}
          />
        )}
        {view === "investments" && (
          <InvestmentDashboard
            search={investmentSearch}
            users={investmentUsersQuery.data ?? []}
            usersLoading={investmentUsersQuery.isPending}
            usersError={investmentUsersQuery.isError}
            onSearch={(value) => {
              setInvestmentSearch(value);
              setInvestmentUser(null);
            }}
            selectedUser={investmentUser}
            onSelectUser={(user) => {
              setInvestmentUser(user);
              setInvestmentSearch(user.email);
            }}
            positions={investmentPositionsQuery.data ?? []}
            positionsLoading={investmentPositionsQuery.isPending}
            positionsError={investmentPositionsQuery.isError}
            onRetryUsers={() => void investmentUsersQuery.refetch()}
            onRetryPositions={() => void investmentPositionsQuery.refetch()}
          />
        )}
        {view === "users" && (
          <UserManagement
            users={usersQuery.data ?? []}
            loading={usersQuery.isPending}
            error={usersQuery.isError}
            onRetry={() => void usersQuery.refetch()}
            search={search}
            onSearch={(value) => setSearch(value)}
            status={status}
            onStatusFilter={(value) => setStatus(value)}
            role={role}
            onRoleFilter={(value) => setRole(value)}
            statusPending={statusMutation.isPending}
            rolePending={roleMutation.isPending}
            onStatus={(user, nextStatus) =>
              statusMutation.mutate({ userId: user.id, nextStatus, reason: reasons[user.id] ?? "" })
            }
            onRole={(user) => roleMutation.mutate({ userId: user.id, makeAdmin: !user.is_admin })}
            onViewInvestments={(user) => {
              setInvestmentUser(user);
              setInvestmentSearch(user.email);
              setView("investments");
            }}
          />
        )}
        {view === "visitors" && (
          <VisitorActivity
            visits={visitorQuery.data ?? []}
            loading={visitorQuery.isPending}
            error={visitorQuery.isError}
            onRetry={() => void visitorQuery.refetch()}
          />
        )}
        {view === "audit" && (
          <AuditLog
            entries={auditQuery.data ?? []}
            loading={auditQuery.isPending}
            error={auditQuery.isError}
            onRetry={() => void auditQuery.refetch()}
          />
        )}
        {view === "support" && (
          <SupportQueue
            tickets={ticketsQuery.data ?? []}
            loading={ticketsQuery.isPending}
            error={ticketsQuery.isError}
            onRetry={() => void ticketsQuery.refetch()}
            search={ticketSearch}
            onSearch={setTicketSearch}
            status={ticketStatus}
            onStatus={setTicketStatus}
          />
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
  onRetry,
  onReview,
}: {
  requests: AccountTransactionRequest[];
  loading: boolean;
  error: boolean;
  notes: Record<string, string>;
  onNote: (id: string, value: string) => void;
  pending: boolean;
  onRetry: () => void;
  onReview: (request: AccountTransactionRequest, approve: boolean) => void;
}) {
  if (error)
    return <RetryPanel message="Transaction requests could not be loaded." onRetry={onRetry} />;
  if (loading)
    return (
      <div className={`${panel} text-sm text-muted-foreground`}>Loading transaction requests…</div>
    );
  if (!requests.length)
    return (
      <div className={`${panel} text-sm text-muted-foreground`}>
        No account transactions are awaiting review.
      </div>
    );

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
                <td className="p-3 capitalize font-medium text-foreground">
                  {request.transaction_type.replaceAll("_", " ")}
                </td>
                <td className="p-3 max-w-xs whitespace-pre-wrap">{request.summary}</td>
                <td className="p-3 text-muted-foreground">
                  {new Date(request.created_at).toLocaleString()}
                </td>
                <td className="p-3">
                  <span
                    className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${request.status === "approved" ? "bg-emerald-500/10 text-emerald-500" : request.status === "rejected" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}`}
                  >
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
                        onClick={() => onReview(request, true)}
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        type="button"
                        className={secondary}
                        disabled={pending}
                        onClick={() => onReview(request, false)}
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {request.review_note || "Reviewed"}
                    </span>
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
  onRetry,
}: {
  data: unknown;
  loading: boolean;
  error: boolean;
  onView: (view: AdminView) => void;
  onRetry: () => void;
}) {
  const entries =
    data && typeof data === "object" && !Array.isArray(data)
      ? Object.entries(data as Record<string, unknown>)
      : [];
  return (
    <div className="space-y-6">
      {error ? (
        <RetryPanel message="Overview metrics are unavailable." onRetry={onRetry} />
      ) : loading ? (
        <div className={`${panel} text-sm text-muted-foreground`}>Loading metrics dashboard…</div>
      ) : (
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {entries.map(([key, value]) => (
            <div className={`${panel} min-w-0`} key={key}>
              <dt className="truncate text-xs capitalize text-muted-foreground">
                {key.replaceAll("_", " ")}
              </dt>
              <dd className="mt-3 truncate text-2xl font-semibold tracking-tight">
                {String(value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Shortcut
          icon={<Users size={18} />}
          title="Users"
          detail="Manage accounts."
          onClick={() => onView("users")}
        />
        <Shortcut
          icon={<Activity size={18} />}
          title="Activity logs"
          detail="Monitor traffic."
          onClick={() => onView("visitors")}
        />
        <Shortcut
          icon={<Activity size={18} />}
          title="Investments"
          detail="View a user’s investment dashboard."
          onClick={() => onView("investments")}
        />
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

function RetryPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className={`${panel} flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground`}
    >
      <span>{message}</span>
      <button type="button" className={secondary} onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function InvestmentDashboard({
  search,
  users,
  usersLoading,
  usersError,
  onSearch,
  selectedUser,
  onSelectUser,
  positions,
  positionsLoading,
  positionsError,
  onRetryUsers,
  onRetryPositions,
}: {
  search: string;
  users: AdminUser[];
  usersLoading: boolean;
  usersError: boolean;
  onSearch: (value: string) => void;
  selectedUser: AdminUser | null;
  onSelectUser: (user: AdminUser) => void;
  positions: AdminInvestmentPosition[];
  positionsLoading: boolean;
  positionsError: boolean;
  onRetryUsers: () => void;
  onRetryPositions: () => void;
}) {
  return (
    <div className="space-y-5">
      <section className={panel}>
        <label className="block text-sm font-medium" htmlFor="investment-user-search">
          Find a user
        </label>
        <input
          id="investment-user-search"
          className={`${field} mt-2`}
          value={search}
          minLength={2}
          autoComplete="off"
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search by name or email"
        />
        {search.trim().length < 2 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Enter at least two characters to find a user.
          </p>
        ) : usersError ? (
          <div className="mt-3">
            <RetryPanel message="User search failed." onRetry={onRetryUsers} />
          </div>
        ) : usersLoading ? (
          <p className="mt-2 text-xs text-muted-foreground">Searching users…</p>
        ) : users.length ? (
          <ul className="mt-3 max-h-56 divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {users.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent"
                  onClick={() => onSelectUser(user)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {user.display_name || user.email}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs capitalize text-muted-foreground">
                    {user.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">No matching users.</p>
        )}
      </section>

      {selectedUser && (
        <section className="space-y-4">
          <div className={panel}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Investment dashboard
            </p>
            <h3 className="mt-1 font-semibold">
              {selectedUser.display_name || selectedUser.email}
            </h3>
            <p className="mt-1 break-all text-sm text-muted-foreground">{selectedUser.email}</p>
          </div>
          {positionsError ? (
            <RetryPanel
              message="Investment positions could not be loaded."
              onRetry={onRetryPositions}
            />
          ) : positionsLoading ? (
            <div className={`${panel} text-sm text-muted-foreground`}>
              Loading investment positions…
            </div>
          ) : positions.length === 0 ? (
            <div className={`${panel} text-sm text-muted-foreground`}>
              This user has no investment positions.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3 font-normal">Plan</th>
                    <th className="p-3 font-normal">Principal</th>
                    <th className="p-3 font-normal">Accrued return</th>
                    <th className="p-3 font-normal">Rate / term</th>
                    <th className="p-3 font-normal">Status</th>
                    <th className="p-3 font-normal">Started</th>
                    <th className="p-3 font-normal">Matures</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => (
                    <tr key={position.id} className="border-b border-border last:border-0">
                      <td className="p-3 font-medium">{position.plan_name}</td>
                      <td className="p-3 tabular-nums">
                        {formatAmount(position.principal)} {position.asset}
                      </td>
                      <td className="p-3 tabular-nums">
                        {formatAmount(position.accrued_return)} {position.asset}
                      </td>
                      <td className="p-3">
                        {position.daily_rate}% · {position.duration_days} days
                      </td>
                      <td className="p-3 capitalize">{position.status.replaceAll("_", " ")}</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(position.started_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(position.redeemable_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function formatAmount(value: number | string): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? amount.toLocaleString(undefined, { maximumFractionDigits: 8 })
    : "—";
}

function UserManagement(props: {
  users: AdminUser[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  search: string;
  onSearch: (value: string) => void;
  status: string;
  onStatusFilter: (value: string) => void;
  role: string;
  onRoleFilter: (value: string) => void;
  statusPending: boolean;
  rolePending: boolean;
  onStatus: (user: AdminUser, status: "active" | "suspended") => void;
  onRole: (user: AdminUser) => void;
  onViewInvestments: (user: AdminUser) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-60 flex-1 text-xs text-muted-foreground">
          Search users
          <input
            className={`${field} mt-2`}
            value={props.search}
            onChange={(e) => props.onSearch(e.target.value)}
            placeholder="Name or email"
          />
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
        <RetryPanel message="Users could not be loaded." onRetry={props.onRetry} />
      ) : props.loading ? (
        <div className={`${panel} text-sm text-muted-foreground`}>Loading users…</div>
      ) : props.users.length === 0 ? (
        <div className={`${panel} text-sm text-muted-foreground`}>
          No users match these filters.
        </div>
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
                      onClick={() => props.onViewInvestments(user)}
                    >
                      Investments
                    </button>
                    <button
                      className={secondary}
                      disabled={props.statusPending || props.rolePending}
                      onClick={() =>
                        props.onStatus(user, user.status === "suspended" ? "active" : "suspended")
                      }
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

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="text-xs text-muted-foreground">
      {label}
      <select
        className={`${field} mt-2 capitalize`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
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
  onRetry,
}: {
  visits: AdminVisitorActivity[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (error)
    return <RetryPanel message="Visitor activity could not be loaded." onRetry={onRetry} />;
  if (loading) return <div className={panel}>Loading visitor activity…</div>;
  if (!visits.length) return <div className={panel}>No visitor activity has been recorded.</div>;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
          <tr>
            <th className="p-3 font-normal">User</th>
            <th className="p-3 font-normal">Route</th>
            <th className="p-3 font-normal">Country</th>
            <th className="p-3 font-normal">Visited</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((visit) => (
            <tr key={visit.id} className="border-b border-border last:border-0">
              <td className="p-3">{visit.display_name || visit.email || visit.id}</td>
              <td className="p-3 font-mono text-xs">{visit.route_id}</td>
              <td className="p-3">{visit.country_of_residence || "—"}</td>
              <td className="p-3 text-muted-foreground">
                {new Date(visit.visited_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditLog({
  entries,
  loading,
  error,
  onRetry,
}: {
  entries: AdminAuditEntry[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (error) return <RetryPanel message="Audit events could not be loaded." onRetry={onRetry} />;
  if (loading) return <div className={panel}>Loading audit events…</div>;
  if (!entries.length) return <div className={panel}>No audit events have been recorded.</div>;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
          <tr>
            <th className="p-3 font-normal">Time</th>
            <th className="p-3 font-normal">Action</th>
            <th className="p-3 font-normal">Actor</th>
            <th className="p-3 font-normal">Entity</th>
            <th className="p-3 font-normal">Details</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-border align-top last:border-0">
              <td className="whitespace-nowrap p-3 text-muted-foreground">
                {new Date(entry.created_at).toLocaleString()}
              </td>
              <td className="p-3 font-medium">{entry.action.replaceAll("_", " ")}</td>
              <td className="p-3">{entry.actor_email || "System"}</td>
              <td className="p-3">
                {entry.entity} · {entry.entity_id}
              </td>
              <td className="max-w-sm break-words p-3 font-mono text-xs">
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
  onRetry,
  search,
  onSearch,
  status,
  onStatus,
}: {
  tickets: AdminTicket[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  search: string;
  onSearch: (value: string) => void;
  status: string;
  onStatus: (value: string) => void;
}) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const messagesQuery = useQuery({
    queryKey: ["admin-ticket-messages", selectedId],
    queryFn: () => {
      if (!selectedId) throw new Error("Select a support ticket.");
      return getAdminTicketMessages(selectedId);
    },
    enabled: !!selectedId,
    retry: false,
  });
  const replyMutation = useMutation({
    mutationFn: ({ ticket, message }: { ticket: AdminTicket; message: string }) => {
      return replyToSupportTicket(ticket.id, message);
    },
    onSuccess: async (_data, { ticket, message }) => {
      setReply("");
      try {
        await sendAdminTransactionalEmail({
          type: "support-reply",
          userId: ticket.user_id,
          email: ticket.email,
          subject: ticket.subject,
          message,
        });
        toast.success("Reply sent. Email notification sent.");
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Email delivery failed.";
        toast.error(`Reply sent, but the email notification was not sent: ${reason}`);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-ticket-messages", selectedId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-tickets"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message || "Unable to send reply."),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: string }) =>
      setSupportTicketStatus(id, nextStatus),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      toast.success("Ticket status updated.");
    },
    onError: (error: Error) => toast.error(error.message || "Unable to update ticket status."),
  });
  const selectedTicket = tickets.find((ticket) => ticket.id === selectedId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-60 flex-1 text-xs text-muted-foreground">
          Search support tickets
          <input
            className={`${field} mt-2`}
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Subject or email"
          />
        </label>
        <Filter
          label="Ticket status"
          value={status}
          onChange={onStatus}
          options={["all", "open", "pending", "closed"]}
        />
      </div>
      {error ? (
        <RetryPanel message="Support tickets could not be loaded." onRetry={onRetry} />
      ) : loading ? (
        <div className={panel}>Loading support tickets…</div>
      ) : tickets.length === 0 ? (
        <div className={panel}>No support tickets match these filters.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-normal">Subject</th>
                <th className="p-3 font-normal">User</th>
                <th className="p-3 font-normal">Category</th>
                <th className="p-3 font-normal">Status</th>
                <th className="p-3 font-normal">Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className={`border-b border-border last:border-0 ${selectedId === ticket.id ? "bg-accent" : ""}`}
                >
                  <td className="p-3 font-medium">
                    <button
                      type="button"
                      className="text-left hover:underline"
                      aria-pressed={selectedId === ticket.id}
                      onClick={() => setSelectedId(ticket.id)}
                    >
                      {ticket.subject}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {ticket.message_count} messages
                      </span>
                    </button>
                  </td>
                  <td className="p-3">{ticket.email}</td>
                  <td className="p-3 capitalize">{ticket.category}</td>
                  <td className="p-3 capitalize">{ticket.status}</td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(ticket.updated_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedTicket && (
        <section className={`${panel} space-y-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{selectedTicket.subject}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedTicket.email} · {selectedTicket.category}
              </p>
            </div>
            <label className="text-xs text-muted-foreground">
              Status
              <select
                className={`${field} mt-1`}
                value={selectedTicket.status}
                disabled={statusMutation.isPending}
                onChange={(event) =>
                  statusMutation.mutate({ id: selectedTicket.id, nextStatus: event.target.value })
                }
              >
                {["open", "pending", "closed"].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {messagesQuery.isError ? (
            <RetryPanel
              message="Ticket messages could not be loaded."
              onRetry={() => void messagesQuery.refetch()}
            />
          ) : messagesQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Loading conversation…</p>
          ) : (
            <ol className="max-h-96 space-y-3 overflow-y-auto">
              {(messagesQuery.data ?? []).map((message) => (
                <li key={message.id} className="rounded-xl border border-border p-3">
                  <p className="mb-1 text-xs font-medium">
                    {message.is_staff ? "Support" : selectedTicket.email} ·{" "}
                    {new Date(message.created_at).toLocaleString()}
                  </p>
                  <p className="whitespace-pre-wrap text-sm">{message.body}</p>
                </li>
              ))}
            </ol>
          )}
          {selectedTicket.status !== "closed" && (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!selectedTicket) return;
                replyMutation.mutate({ ticket: selectedTicket, message: reply.trim() });
              }}
            >
              <label className="block text-sm font-medium" htmlFor="support-reply">
                Reply
              </label>
              <textarea
                id="support-reply"
                className={`${field} min-h-24`}
                maxLength={5000}
                required
                value={reply}
                onChange={(event) => setReply(event.target.value)}
              />
              <button
                type="submit"
                className={primary}
                disabled={!reply.trim() || replyMutation.isPending}
              >
                {replyMutation.isPending ? "Sending…" : "Send reply"}
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
