# Oktrade

can you build something like OKX.com

Theme black and white, all OKX features/buttons must be added. No stone must be left unturned, it must be exceptionally flawless and perfect.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://oktrade.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/342d2068-92c1-4cd1-b01d-c4154f0d3a2c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Vercel deployment and CI

Import this repository into Vercel and connect it to GitHub. `vercel.json` selects
the Vercel Nitro preset and uses `npm ci` for reproducible installs. Vercel can
then create preview deployments for pull requests and production deployments from
`main`.

Add these Supabase variables to the Vercel Preview and Production environments:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, and
`SUPABASE_PUBLISHABLE_KEY`. Never add a Supabase service-role key to the Vercel
client environment.

The GitHub Actions CI workflow runs lint, tests, and a Vercel-targeted build on
pull requests and pushes to `main`. Require the `CI / verify` check in GitHub
branch protection if merges to `main` should wait for CI.

## Database approval setup

Deposit requests, approved balances, and admin-approved account transactions are stored in
Supabase. Apply these migrations to the connected project, in timestamp order, before using
deposits, transactions, approvals, support, or admin controls:

- `supabase/migrations/20261031000000_deposit_approval_ledger.sql`
- `supabase/migrations/20261031000001_admin_manual_balance_topup.sql`
- `supabase/migrations/20261031000002_admin_investment_plan_controls.sql`
- `supabase/migrations/20261031000003_admin_user_activity.sql`
- `supabase/migrations/20261031000004_support_live_chat.sql`
- `supabase/migrations/20261031000005_admin_balance_adjustment.sql`
- `supabase/migrations/20261031000006_admin_transaction_approvals.sql`
- `supabase/migrations/20261031000007_admin_audit_and_visitor_activity.sql`
- `supabase/migrations/20261104000000_admin_review_audit_resolution.sql`
- `supabase/migrations/20261104000001_repair_account_and_approval_rpcs.sql`
- `supabase/migrations/20261104000002_transaction_history_and_investment_reviews.sql`
- `supabase/migrations/20261104000003_repair_investment_plan_controls.sql`
- `supabase/migrations/20261104000004_rebuild_investment_management.sql`
- `supabase/migrations/20261104000005_repair_investment_admin_rpcs.sql`
- `supabase/migrations/20261104000006_harden_investment_migration.sql`

You can apply them with the Supabase CLI (`supabase db push`) or through the
Supabase SQL editor.

After creating the first Supabase Auth user, a trusted project operator must grant
that user the `admin` role in `public.user_roles`. The admin review page checks the
role in the database; never expose the Supabase service-role key in the browser.

Run the following from the Supabase SQL editor as a trusted project operator,
replacing the email with the exact administrator account:

```sql
insert into public.user_roles (user_id, role)
select u.id, 'admin'
from auth.users u
where u.email = 'admin@example.com'
	and not exists (
		select 1
		from public.user_roles r
		where r.user_id = u.id and r.role = 'admin'
	);
```

Allow the app's `/reset-password` URL in Supabase Auth redirect settings for each
deployed origin. Do not grant the first admin role through client-side code.
The admin Visitors view records authenticated route visits, date/time and the account's
self-reported country at the time of the visit. It keeps the latest 500 visits per account
and does not collect anonymous visit logs, IP addresses or inferred geolocation.

The Express Buy page has been removed. Spot and futures order controls remain available as
approval-gated demo actions.

Every user-initiated account transaction (including purchases, spot/futures orders, conversions,
withdrawals, earn, copy trading, bots, loans and rewards) is submitted as pending and does not
change the server account state until an administrator approves it in **Admin operations →
Transaction approvals**. Only one transaction per user can await review at a time. Deposits keep
their separate deposit approval queue.

The server account state is initialized from approved server-side balances. Legacy browser-only
accounts and local balances are not imported as approved funds; users must sign up or sign in with
Supabase Auth.

The Transaction history page reads pending/reviewed transactions and deposits from the server and
displays system-generated internal references. Deposit blockchain hashes must still be copied from
the sending wallet; the preview cannot fabricate a real on-chain transaction ID. Admin-managed
investment plans are shown in the Earn catalog, and investment subscriptions/redemptions can be
reviewed both in Transaction approvals and in the Investment section.

The investment-management rebuild uses server-owned plan, position, and request tables. Subscription
funds move only when an administrator approves a request; accrued return is calculated from the
approved position’s saved terms and is credited with principal only after redemption approval.
Applying `20261104000004_rebuild_investment_management.sql` preserves a restricted backup of legacy
Earn payloads before migration and stops if any entry is malformed or has a zero-day term; review and
reconcile such records before retrying. It preserves legacy activity and transaction-request history
and does not delete existing plans. Approved legacy Earn positions are migrated with their original
principal, rate, term, and start time; plan and request changes are audited. The follow-up
`20261104000005_repair_investment_admin_rpcs.sql` restores the admin plan/position RPCs on drifted
deployments and supports loading the full position history in pages. The final
`20261104000006_harden_investment_migration.sql` applies the function hardening and database guards
for systems where the rebuild already ran. Existing zero-day positions retain their saved terms and
accrual behavior and are not auto-approved for redemption; pending zero-day requests are marked for
manual review. New zero-day subscriptions and positions are rejected.

If the earlier, destructive version of migration 00004 was already applied, migration 00006 cannot
recover earn payloads or transaction history it deleted. Restore those records from a pre-migration
database backup before release; the new backup table only preserves data still present when it runs.
