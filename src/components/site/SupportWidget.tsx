import { Link, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Headphones, MessageCircle, Plus, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getMySupportMessages,
  listMySupportTickets,
  createSupportTicket,
  replyToMySupportTicket,
} from "@/lib/support";
import { useAccount } from "@/lib/store";
import { cn } from "@/lib/utils";

export function SupportWidget() {
  const account = useAccount();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [open, setOpen] = useState(false);
  const [greetingVisible, setGreetingVisible] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isNewConversation, setIsNewConversation] = useState(false);
  const [draft, setDraft] = useState("");
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedTicketId(null);
    setIsNewConversation(false);
  }, [account?.user.uid]);

  const ticketsQuery = useQuery({
    queryKey: ["my-support-tickets", account?.user.uid],
    queryFn: listMySupportTickets,
    enabled: !!account && open,
    retry: false,
    refetchInterval: open ? 20_000 : false,
  });

  const messagesQuery = useQuery({
    queryKey: ["my-support-messages", account?.user.uid, selectedTicketId],
    queryFn: () => {
      if (!selectedTicketId) throw new Error("Select a support conversation.");
      return getMySupportMessages(selectedTicketId);
    },
    enabled: !!account && open && !!selectedTicketId,
    retry: false,
    refetchInterval: open && selectedTicketId ? 5_000 : false,
  });

  useEffect(() => {
    if (selectedTicketId || isNewConversation || !ticketsQuery.data?.length) return;
    const activeTicket = ticketsQuery.data.find((ticket) => ticket.status !== "closed");
    setSelectedTicketId(activeTicket?.id ?? ticketsQuery.data[0]?.id ?? null);
  }, [isNewConversation, selectedTicketId, ticketsQuery.data]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messagesQuery.data, open, selectedTicketId]);

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!account) throw new Error("Sign in to message support.");
      if (selectedTicketId) return replyToMySupportTicket(selectedTicketId, body);
      return createSupportTicket({
        subject: "Live website support",
        category: "other",
        body,
      });
    },
    onSuccess: async (result) => {
      setDraft("");
      if (!selectedTicketId) {
        setSelectedTicketId(result);
        setIsNewConversation(false);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-support-tickets", account?.user.uid] }),
        queryClient.invalidateQueries({
          queryKey: ["my-support-messages", account?.user.uid, selectedTicketId ?? result],
        }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message || "Unable to send your message."),
  });

  const activeTicket = ticketsQuery.data?.find((ticket) => ticket.id === selectedTicketId);
  const canReply = !activeTicket || activeTicket.status !== "closed";
  const messageError = ticketsQuery.isError || messagesQuery.isError;

  return (
    <div className="fixed bottom-5 right-4 z-[70] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {greetingVisible && !open && (
        <div className="flex max-w-[min(19rem,calc(100vw-2rem))] items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-2xl">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <Headphones className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Hello! Need a hand?</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Say hello to our support team. We’re happy to help.
            </p>
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-foreground underline underline-offset-4"
              onClick={() => {
                setGreetingVisible(false);
                setOpen(true);
              }}
            >
              Start a conversation
            </button>
          </div>
          <button
            type="button"
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Dismiss support greeting"
            onClick={() => setGreetingVisible(false)}
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {open && (
        <section
          aria-label="Live support chat"
          className="flex h-[min(40rem,calc(100dvh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
        >
          <header className="flex items-center gap-3 border-b border-border bg-primary px-4 py-4 text-primary-foreground">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-primary-foreground/20 bg-primary-foreground/10">
              <Headphones className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold">OK Trade Support</h2>
              <p className="mt-0.5 text-xs text-primary-foreground/70">Secure customer care</p>
            </div>
            {account && !isNewConversation && (ticketsQuery.data?.length ?? 0) > 0 && (
              <select
                aria-label="Choose a support conversation"
                className="max-w-28 rounded-lg border border-primary-foreground/20 bg-primary px-2 py-1.5 text-xs text-primary-foreground outline-none"
                value={selectedTicketId ?? ""}
                onChange={(event) => {
                  setIsNewConversation(false);
                  setSelectedTicketId(event.target.value || null);
                }}
              >
                {ticketsQuery.data?.map((ticket) => (
                  <option key={ticket.id} value={ticket.id} className="bg-card text-foreground">
                    {ticket.status === "closed" ? "Closed · " : ""}
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            )}
            {account && (
              <button
                type="button"
                aria-label="Start a new conversation"
                title="New conversation"
                className="rounded-full p-2 transition-colors hover:bg-primary-foreground/10"
                onClick={() => {
                  setSelectedTicketId(null);
                  setIsNewConversation(true);
                }}
              >
                <Plus className="size-4" />
              </button>
            )}
            <button
              type="button"
              aria-label="Close support chat"
              className="rounded-full p-2 transition-colors hover:bg-primary-foreground/10"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto bg-background p-4">
            <div className="mx-auto w-fit rounded-full border border-border bg-card px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              OK Trade · Secure support
            </div>
            <div className="max-w-[88%] rounded-2xl rounded-tl-sm border border-border bg-card px-3.5 py-3 text-sm leading-relaxed shadow-sm">
              Hello{account?.user.nickname ? `, ${account.user.nickname}` : ""}! Welcome to OK Trade
              support. How can we help you today?
              <p className="mt-2 text-[10px] text-muted-foreground">
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            {!account ? (
              <div className="rounded-2xl border border-border bg-card p-4 text-sm">
                <p className="font-medium">Sign in to start a secure conversation</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Your support history stays connected to your account.
                </p>
                <Link
                  to="/login"
                  search={{ redirect: pathname }}
                  className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-85"
                >
                  Sign in to chat
                </Link>
              </div>
            ) : messageError ? (
              <div className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
                {ticketsQuery.isError
                  ? "Your conversations could not be loaded."
                  : "This conversation could not be loaded."}{" "}
                <button
                  type="button"
                  className="font-semibold text-foreground underline"
                  onClick={() => {
                    if (ticketsQuery.isError) void ticketsQuery.refetch();
                    if (messagesQuery.isError) void messagesQuery.refetch();
                  }}
                >
                  Retry
                </button>
              </div>
            ) : ticketsQuery.isPending || (selectedTicketId && messagesQuery.isPending) ? (
              <p className="text-center text-xs text-muted-foreground">
                Loading your secure conversation…
              </p>
            ) : (
              <>
                {messagesQuery.data?.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "max-w-[88%] rounded-2xl px-3.5 py-3 text-sm leading-relaxed shadow-sm",
                      message.is_staff
                        ? "rounded-tl-sm border border-border bg-card"
                        : "ml-auto rounded-tr-sm bg-primary text-primary-foreground",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <p
                      className={cn(
                        "mt-2 text-right text-[10px]",
                        message.is_staff ? "text-muted-foreground" : "text-primary-foreground/70",
                      )}
                    >
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
                {activeTicket?.status === "closed" && (
                  <div className="rounded-2xl border border-border bg-card p-3 text-center text-xs text-muted-foreground">
                    This conversation is closed. Start a new one if you still need help.
                  </div>
                )}
              </>
            )}
            <div ref={messageEndRef} />
          </div>

          {account && canReply && !ticketsQuery.isError && !messagesQuery.isError && (
            <form
              className="flex items-end gap-2 border-t border-border bg-card p-3"
              onSubmit={(event) => {
                event.preventDefault();
                const body = draft.trim();
                if (body.length < 3 || sendMutation.isPending) return;
                sendMutation.mutate(body);
              }}
            >
              <textarea
                aria-label="Your support message"
                className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-input bg-background px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Write a message…"
                maxLength={5000}
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={draft.trim().length < 3 || sendMutation.isPending}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="size-4" />
              </button>
            </form>
          )}
          {sendMutation.isError && (
            <p
              role="status"
              className="border-t border-border bg-card px-4 py-2 text-xs text-muted-foreground"
            >
              Message wasn’t sent. Your draft is still here; try again.
            </p>
          )}
          <p className="border-t border-border bg-card px-4 py-2 text-center text-[10px] text-muted-foreground">
            Never share your password, verification codes, or recovery phrase.
          </p>
        </section>
      )}

      <button
        type="button"
        aria-label={open ? "Close support chat" : "Open live support chat"}
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          setGreetingVisible(false);
        }}
        className="group flex items-center gap-3 rounded-full border border-border bg-primary py-3 pl-3 pr-5 text-primary-foreground shadow-xl transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="grid size-10 place-items-center rounded-full border border-primary-foreground/20 bg-primary-foreground/10">
          {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
        </span>
        <span className="text-left">
          <span className="block text-sm font-semibold">
            {open ? "Close chat" : "Live support"}
          </span>
          <span className="block text-[10px] text-primary-foreground/70">
            {open ? "We’re here to help" : "Say hello to our team"}
          </span>
        </span>
      </button>
    </div>
  );
}
