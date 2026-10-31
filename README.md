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

## Deposit approval setup

Deposit requests and approved deposit balances are stored in Supabase. Apply these
migrations to the connected project, in timestamp order, before using deposit
requests, admin approvals or manual top-ups:

- `supabase/migrations/20261031000000_deposit_approval_ledger.sql`
- `supabase/migrations/20261031000001_admin_manual_balance_topup.sql`

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

Existing browser-only accounts and balances are not migrated to Supabase Auth or
the approved deposit ledger. Users must sign up or sign in with Supabase Auth;
legacy local balances are not treated as verified deposits.
