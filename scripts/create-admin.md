# Create the first admin

Apply the Supabase schema migrations first. `ADMIN` already exists in
`public.user_role`; the existing Auth trigger creates its `public.profiles` row.
Account provisioning runs separately so credentials are not stored in SQL
migration history. It uses Supabase's server-side `auth.admin.createUser` API:
https://supabase.com/docs/reference/javascript/auth-admin-createuser

From the project root, using Node.js 20.12 or later:

```powershell
npm run admin:create -- --email 'admin@example.com' --password 'your-long-password'
```

The script reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from
`.env.local` or existing environment variables. It supports local and hosted
projects, using the configured URL as its target.

You can supply `ADMIN_EMAIL` and `ADMIN_PASSWORD` through environment variables
instead of command arguments, then run `npm run admin:create`. Keep actual
credentials out of committed files; command arguments can appear in shell history.

The email is confirmed during creation, allowing immediate password sign-in.
Passwords must have at least 12 characters and satisfy the project's Auth policy.
The script verifies both the Auth role and profile after creation. Re-running it
for the same admin verifies the account without changing its password. A different
existing admin causes it to stop, respecting the single-admin database constraint.
An email already registered to a non-admin is not automatically promoted.
