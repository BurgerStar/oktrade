<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Architecture rules

- Market data comes from the public OKX v5 REST/WebSocket API in the browser (`src/lib/market.ts`); every fetcher falls back to simulated data so pages never break when the API is unreachable.
- Account, balances, orders, positions and products are a demo account: pure state transitions in `src/lib/account.ts` (unit-tested in `src/lib/account.test.ts`), persisted to localStorage via `src/lib/store.ts`. Never mutate state; add new money logic as a pure function there first.
- UI calls money actions through `useAction()` from `src/components/site/hooks.ts` (auth guard + toast); read state with `useAccount()` / `usePrefs()`. Store state is client-only — render signed-in UI only from these hooks, never from SSR.
- Header/footer live in `__root.tsx`; `/trade/*` and `/futures/*` are full-screen (no footer).
- Nav links are defined once in `src/lib/nav.ts`; every `to` there must have a route file.
- Strict black & white theme via tokens in `src/styles.css`; only `up`/`down` tokens carry color (price moves). Dark is default, `.light` flips it.
- Shared UI primitives (CoinIcon, PctChange, Container, PageHero, PillTabs, LineTabs, EmptyState, Stat, Logo) are in `src/components/site/primitives.tsx`.
