import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowDownToLine, ExternalLink, Search, ShieldCheck, Users } from "lucide-react";
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
  listAdminInvestmentPlans,
  listAdminTickets,
  listAdminUserActivity,
  listAdminUsers,
  setAdminRole,
  updateAdminInvestmentPlan,
  updateAdminUserStatus,
  type AdminAuditEntry,
  type AdminInvestmentPlan,
  type AdminTicket,
  type AdminUser,
  type AdminUserActivity,
} from "@/lib/admin";
import { getIsAdmin } from "@/lib/deposits";
import { useAccount } from "@/lib/store";

export const Route = createFileRoute("/admin/")({
  head: () => accountMeta("Admin operations"),
  component: Page,
});

type AdminView = "overview" | "users" | "visitors" | "audit" | "support" | "investment";
const VIEWS: { id: AdminView; label: string }[] = [
  { id: "overview", label: "Overview" },
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
    queryKey: ["admin-user-activity", account?.user.uid],
    queryFn: () => listAdminUserActivity(100),
    enabled: !!account && adminQuery.data === true && view === "visitors",
    retry: false,
    refetchInterval: 30_000,
  });
  const auditQuery = useQuery({
    queryKey: ["admin-audit", account?.user.uid],
    queryFn: () => listAdminAudit("all", 50),
    enabled: !!account && adminQuery.data === true && view === "audit",
    retry: false,
    refetchInterval: 30_000,
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

  if (!account) return null;
  if (adminQuery.isPending)
    return <p className="text-sm text-muted-foreground">Checking administrator access…</p>;
  if (adminQuery.isError)
    return (
      <div className={`${panel} text-sm text-muted-foreground`}>
        Admin access could not be verified.
      </div>
    );
  if (!adminQuery.data)
    return (
      <div className={`${panel} text-sm text-muted-foreground`}>
        You don’t have permission to manage this workspace.
      </div>
    );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Operations console
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Control center</h2>
        </div>
        <Link to="/admin/deposits" className={primary}>
          <ArrowDownToLine size={16} /> Deposit approvals
        </Link>
      </header>
      <nav
        className="flex gap-5 overflow-x-auto border-b border-border"
        aria-label="Admin sections"
      >
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={view === item.id}
            className={`shrink-0 border-b-2 py-3 text-sm ${view === item.id ? "border-foreground font-semibold" : "border-transparent text-muted-foreground"}`}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {view === "overview" && (
        <Overview
          data={overviewQuery.data}
          loading={overviewQuery.isPending}
          error={overviewQuery.isError}
          onView={setView}
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
          users={visitorQuery.data ?? []}
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
      className={`${panel} flex items-center gap-4 text-left hover:bg-accent`}
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
  users,
  loading,
  error,
}: {
  users: AdminUserActivity[];
  loading: boolean;
  error: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className={`${panel} text-sm leading-relaxed text-muted-foreground`}>
        This view shows authenticated accounts only. Anonymous page visits, IP addresses, and
        inferred locations are not collected; country is self-reported during signup.
      </div>
      {error ? (
        <div className={`${panel} text-sm text-muted-foreground`}>
          Account activity is unavailable.
        </div>
      ) : loading ? (
        <div className={`${panel} text-sm text-muted-foreground`}>Loading account activity…</div>
      ) : users.length ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
              <tr>
                {["Account", "Country (self-reported)", "Last active", "Created", "Status"].map(
                  (heading) => (
                    <th key={heading} className="p-3 font-normal">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <span className="font-medium">{user.display_name || user.email}</span>
                    <span className="block text-xs text-muted-foreground">{user.email}</span>
                  </td>
                  <td className="p-3">{user.country_of_residence || "Not provided"}</td>
                  <td className="p-3 text-muted-foreground">
                    {user.last_active ? new Date(user.last_active).toLocaleString() : "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 capitalize">{user.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={`${panel} text-sm text-muted-foreground`}>
          No authenticated accounts found.
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
  if (error)
    return (
      <div className={`${panel} text-sm text-muted-foreground`}>Support queue is unavailable.</div>
    );
  if (loading)
    return <div className={`${panel} text-sm text-muted-foreground`}>Loading support queue…</div>;
  if (!tickets.length)
    return <div className={`${panel} text-sm text-muted-foreground`}>No support tickets.</div>;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
          <tr>
            {["Subject", "User", "Category", "Priority", "Status", "Updated"].map((heading) => (
              <th key={heading} className="p-3 font-normal">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="border-b border-border last:border-0">
              <td className="p-3">
                <span className="font-medium">{ticket.subject}</span>
                <span className="block text-xs text-muted-foreground">
                  {ticket.message_count} messages
                </span>
              </td>
              <td className="p-3">{ticket.email}</td>
              <td className="p-3">{ticket.category}</td>
              <td className="p-3 capitalize">{ticket.priority}</td>
              <td className="p-3 capitalize">{ticket.status}</td>
              <td className="p-3 text-muted-foreground">
                {new Date(ticket.updated_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InvestmentOperations({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const plansQuery = useQuery({
    queryKey: ["admin-investment-plans", userId],
    queryFn: listAdminInvestmentPlans,
    retry: false,
  });
  const updateMutation = useMutation({
    mutationFn: updateAdminInvestmentPlan,
    onSuccess: async () => {
      toast.success("Investment plan settings saved");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-investment-plans"] }),
        queryClient.invalidateQueries({ queryKey: ["public-investment-plans"] }),
      ]);
    },
    onError: (error) => toast.error(error.message || "Unable to save plan settings"),
  });
  return (
    <div className="space-y-5">
      <div className={`${panel} flex items-start gap-4`}>
        <ShieldCheck className="mt-0.5 shrink-0" size={20} />
        <div>
          <h3 className="font-semibold">Investment product controls</h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            These controls update public plan display only. They do not execute investments,
            determine eligibility, or calculate payouts. Every change requires a reason and is added
            to the audit log.
          </p>
        </div>
      </div>
      {plansQuery.isError ? (
        <div className={`${panel} text-sm text-muted-foreground`}>
          Plan settings are unavailable. Apply the investment-plan migration to enable edits.
        </div>
      ) : plansQuery.isPending ? (
        <div className={`${panel} text-sm text-muted-foreground`}>Loading plan settings…</div>
      ) : plansQuery.data?.length ? (
        <div className="space-y-4">
          {plansQuery.data.map((plan) => (
            <InvestmentPlanEditor
              key={plan.id}
              plan={plan}
              busy={updateMutation.isPending}
              onSave={(input) => updateMutation.mutate(input)}
            />
          ))}
        </div>
      ) : (
        <div className={`${panel} text-sm text-muted-foreground`}>No plans are configured.</div>
      )}
    </div>
  );
}

function InvestmentPlanEditor({
  plan,
  busy,
  onSave,
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
        setReason("");
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
        <button type="submit" className={primary} disabled={busy || reason.trim().length < 3}>
          Save plan settings
        </button>
      </div>
    </form>
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
