import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  AccountShell,
  accountMeta,
  panel,
  field,
  primary,
  secondary,
} from "@/components/account/AccountShell";
import { getIsAdmin, listAdminDepositRequests, reviewDepositRequest } from "@/lib/deposits";
import { useAccount } from "@/lib/store";

export const Route = createFileRoute("/admin/deposits")({
  head: () => accountMeta("Deposit approvals"),
  component: Page,
});

function Page() {
  return (
    <AccountShell title="Deposit approvals">
      <Approvals />
    </AccountShell>
  );
}

function Approvals() {
  const account = useAccount();
  const queryClient = useQueryClient();
  const adminQuery = useQuery({
    queryKey: ["viewer-is-admin", account?.user.uid],
    queryFn: getIsAdmin,
    enabled: !!account,
    retry: false,
  });
  const requestsQuery = useQuery({
    queryKey: ["admin-deposit-requests", account?.user.uid],
    queryFn: listAdminDepositRequests,
    enabled: !!account && adminQuery.data === true,
    retry: false,
    refetchInterval: 30_000,
  });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const reviewMutation = useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note: string }) =>
      reviewDepositRequest(id, approve, note),
    onSuccess: async (_data, variables) => {
      toast.success(
        variables.approve ? "Deposit approved and balance credited" : "Deposit rejected",
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-deposit-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["my-deposit-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["my-approved-deposit-balances"] }),
      ]);
    },
    onError: (error) => toast.error(error.message || "Unable to review deposit request"),
  });

  if (!account) return null;
  if (adminQuery.isPending)
    return <p className="text-sm text-muted-foreground">Checking administrator access…</p>;
  if (adminQuery.isError)
    return (
      <div className={`${panel} text-sm text-muted-foreground`}>
        Administrator access could not be verified. No requests were loaded.
      </div>
    );
  if (!adminQuery.data)
    return (
      <div className={`${panel} text-sm text-muted-foreground`}>
        You don’t have permission to review deposit requests.
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Review each transaction on its selected network before approving. Approval updates the
          user’s server-side deposit balance; rejected or pending requests do not change balances.
        </p>
      </div>
      {requestsQuery.isError ? (
        <div className={`${panel} text-sm text-muted-foreground`}>
          Deposit requests could not be loaded. Confirm the database migration is applied and your
          administrator role is active.
        </div>
      ) : requestsQuery.isPending ? (
        <div className={`${panel} text-sm text-muted-foreground`}>Loading deposit requests…</div>
      ) : requestsQuery.data?.length ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-normal">User</th>
                <th className="p-3 font-normal">Asset / network</th>
                <th className="p-3 font-normal">Amount</th>
                <th className="p-3 font-normal">Transaction ID</th>
                <th className="p-3 font-normal">Submitted</th>
                <th className="p-3 font-normal">Status</th>
                <th className="p-3 font-normal">Review</th>
              </tr>
            </thead>
            <tbody>
              {requestsQuery.data.map((request) => (
                <tr key={request.id} className="border-b border-border align-top last:border-0">
                  <td className="max-w-48 break-all p-3">{request.email ?? request.user_id}</td>
                  <td className="p-3">
                    <span className="font-medium">{request.asset}</span>
                    <span className="block text-xs text-muted-foreground">{request.network}</span>
                  </td>
                  <td className="tabular p-3">
                    {Number(request.amount).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                  </td>
                  <td className="max-w-56 break-all p-3 font-mono text-xs">{request.tx_hash}</td>
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
                          onChange={(event) =>
                            setNotes((current) => ({
                              ...current,
                              [request.id]: event.target.value,
                            }))
                          }
                        />
                        <div className="flex gap-2">
                          <button
                            className={primary}
                            disabled={reviewMutation.isPending}
                            onClick={() =>
                              reviewMutation.mutate({
                                id: request.id,
                                approve: true,
                                note: notes[request.id] ?? "",
                              })
                            }
                          >
                            <Check size={15} /> Approve
                          </button>
                          <button
                            className={secondary}
                            disabled={reviewMutation.isPending}
                            onClick={() =>
                              reviewMutation.mutate({
                                id: request.id,
                                approve: false,
                                note: notes[request.id] ?? "",
                              })
                            }
                          >
                            <X size={15} /> Reject
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {request.review_note || "No review note"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={`${panel} text-sm text-muted-foreground`}>No deposit requests yet.</div>
      )}
    </div>
  );
}
