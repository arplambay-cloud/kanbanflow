# KanbanFlow — Security, Functionality & Stack Audit

**Audited:** 2026-08-31 · **Branch:** `main` @ `121231b` · **Scope:** `src/`, `api/`, `supabase/`, build & deploy config
**Auditor note:** all findings below were verified against the code in this repo, not inferred. Line references are clickable.

---

## 🔴 Executive summary

| Area | Grade | One-line verdict |
|---|---|---|
| **Security** | 🔴 **F** | An unauthenticated public endpoint can mint admin accounts. RLS is effectively "any logged-in user owns everything." |
| **Functionality** | 🔴 **D** | It is not a team app. All boards/tasks/comments live in each user's `localStorage` — nothing is shared between users. |
| **Architecture** | 🟠 **C−** | A complete Supabase schema exists and is 90% unused. Two data models coexist and disagree. |
| **Code quality** | 🟡 **C+** | Clean, consistent, type-checks with `strict: true`. But zero tests, zero linting, God-object context, 1030-line components. |
| **Stack choice** | 🟢 **B+** | The *stack itself* is a good, modern, cheap choice. The problem is the implementation, not the tools. |

**Bottom line:** the UI is genuinely well-built and polished. Underneath it, this is a **single-player demo wearing a multi-user app's clothes**, and it currently has a remotely exploitable privilege-escalation hole. Do not run this on a public domain until §1.1 and §1.2 are fixed.

---

## 1. 🔐 Security findings

Ranked by severity. Severity = exploitability × blast radius.

| # | Severity | Finding | Location |
|---|---|---|---|
| 1.1 | 🔴 **Critical** | Unauthenticated API creates admin users | [api/create-user.ts](api/create-user.ts) |
| 1.2 | 🔴 **Critical** | Any user can self-promote to `admin` (RLS gap) | [schema.sql:204](supabase/schema.sql#L204) |
| 1.3 | 🔴 **Critical** | Signup metadata sets your own role | [schema.sql:41](supabase/schema.sql#L41) |
| 1.4 | 🟠 **High** | RLS = "authenticated can do anything to any row" | [schema.sql:206-213](supabase/schema.sql#L206-L213) |
| 1.5 | 🟠 **High** | Zero server-side *or* client-side admin authorization | entire `src/` |
| 1.6 | 🟠 **High** | Storage buckets fully public + any user can delete any file | [schema.sql:218-224](supabase/schema.sql#L218-L224) |
| 1.7 | 🟡 **Medium** | `SECURITY DEFINER` function without pinned `search_path` | [schema.sql:64](supabase/schema.sql#L64) |
| 1.8 | 🟡 **Medium** | Auth bypass fallback grants local admin when Supabase is unset | [AuthContext.tsx:238](src/context/AuthContext.tsx#L238) |
| 1.9 | 🟡 **Medium** | "Secret login path" is security-by-obscurity, and it leaked | [App.tsx:22](src/App.tsx#L22) |
| 1.10 | 🟢 **Low** | Cron endpoint auth is opt-in, not enforced | [api/keep-alive.ts:7](api/keep-alive.ts#L7) |
| 1.11 | 🟢 **Low** | Weak password policy (6 chars), `Math.random()` generator | [ResetPasswordView.tsx:42](src/components/auth/ResetPasswordView.tsx#L42) |

### ✅ What's clean

Worth stating plainly, because it's the part most projects get wrong:

- **No dependency vulnerabilities** — `npm audit` returns 0 across 221 packages.
- **Service-role key is correctly server-only** — not `VITE_`-prefixed, and verified absent from `dist/`.
- **No secret leaked to git history** — only Supabase *publishable* and Clerk *publishable* keys were ever committed (both are public by design). `.env` is now correctly gitignored.
- **No XSS sinks** — no `dangerouslySetInnerHTML`, no `innerHTML`, no `eval`. React's escaping is doing its job everywhere.
- **`target="_blank"` carries `rel="noopener noreferrer"`** ([TaskModal.tsx:509](src/components/tasks/TaskModal.tsx#L509)).
- Project compiles clean under `tsc --strict`.

---

### 1.1 🔴 CRITICAL — `/api/create-user` is a public admin factory

[api/create-user.ts](api/create-user.ts) has **no authentication check of any kind**. It accepts `role` straight from the request body ([:16](api/create-user.ts#L16)) and passes it to `auth.admin.createUser` using the **service-role key** ([:40](api/create-user.ts#L40)).

Anyone on the internet who knows the URL can run:

```bash
curl -X POST https://<your-domain>/api/create-user \
  -H 'Content-Type: application/json' \
  -d '{"email":"attacker@evil.com","password":"hunter2","role":"admin","fullName":"x"}'
```

…and receive a **confirmed, password-set admin account** in your Supabase project. `email_confirm: true` ([:44](api/create-user.ts#L44)) means no mailbox access is needed. This is a complete authentication bypass, and the secret login path does not protect it — API routes are not behind that gate.

**Fix — verify the caller's JWT and their admin role server-side:**

```ts
// api/create-user.ts — add before any work is done
const token = (req.headers.authorization || '').replace('Bearer ', '');
if (!token) return res.status(401).json({ error: 'Unauthorized' });

const { data: { user: caller }, error: authErr } =
  await supabaseAdmin.auth.getUser(token);
if (authErr || !caller) return res.status(401).json({ error: 'Unauthorized' });

const { data: callerProfile } = await supabaseAdmin
  .from('profiles').select('role').eq('id', caller.id).single();
if (callerProfile?.role !== 'admin')
  return res.status(403).json({ error: 'Admin role required' });
```

…and send the token from the client in [AuthContext.tsx:428](src/context/AuthContext.tsx#L428):

```ts
const { data: { session } } = await supabase.auth.getSession();
const response = await fetch('/api/create-user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token ?? ''}`,
  },
  body: JSON.stringify({ email: cleanEmail, password, fullName: cleanName, role, jobTitle }),
});
```

Add rate limiting too (Vercel Firewall, or a simple IP counter) — this endpoint creates real auth users.

---

### 1.2 🔴 CRITICAL — Any member can promote themselves to admin

[schema.sql:204](supabase/schema.sql#L204):

```sql
create policy "Allow profile self update" on public.profiles
  for update using (auth.uid() = id);
```

The policy correctly restricts *which row* you can edit — but places **no restriction on which columns**. `role` is a column in that row. So any authenticated member can run, straight from the browser console with the public anon key:

```js
await supabase.from('profiles').update({ role: 'admin' }).eq('id', myUserId);
```

They are now an admin. The app's UI even offers this as a button in some paths.

**Fix — block role changes at the database level with a trigger:**

```sql
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role then
    if not exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    ) then
      raise exception 'Only admins may change roles';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();
```

Also add an explicit `with check` so the id can never be swapped:

```sql
drop policy if exists "Allow profile self update" on public.profiles;
create policy "Allow profile self update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
```

> **Stronger alternative:** move `role` out of `profiles` entirely into a `user_roles` table that has *no* user-writable policy, and read it via a `security definer` helper. Self-editable profile rows and authorization data should not share a table.

---

### 1.3 🔴 CRITICAL — Signup metadata chooses your own role

[schema.sql:41](supabase/schema.sql#L41):

```sql
assigned_role := coalesce(new.raw_user_meta_data->>'role', 'member');
```

`raw_user_meta_data` is **fully attacker-controlled** — it's the `options.data` object on `signUp`. If public signup is enabled on the Supabase project, this is a one-request admin grant:

```js
await supabase.auth.signUp({
  email, password,
  options: { data: { role: 'admin' } },   // trusted verbatim by the trigger
});
```

**Fix — never read role from user metadata. Hardcode it:**

```sql
if user_count = 0 then
  assigned_role := 'admin';
else
  assigned_role := 'member';   -- promotion is an admin action, never a signup claim
end if;
```

Then confirm **Authentication → Providers → Email → "Allow new users to sign up"** is **disabled** in the Supabase dashboard. This app has no public-signup screen, so signup should be off entirely — but note that disabling it in the dashboard is a *mitigation*, not the fix. Fix the trigger regardless.

---

### 1.4 🟠 HIGH — RLS grants every user total access to every row

[schema.sql:206-213](supabase/schema.sql#L206-L213) — eight tables share this shape:

```sql
create policy "Allow authenticated all on tasks" on public.tasks
  for all using (auth.role() = 'authenticated');
```

`for all` covers SELECT + INSERT + UPDATE + DELETE. `auth.role() = 'authenticated'` is true for *literally any logged-in user*. There is no ownership, membership, or workspace check anywhere. Concretely, any member can:

- Read **every** notification addressed to every other user, and the full activity log
- Delete **every** board, column, and task in the workspace with one call
- Rewrite any comment's `user_id` / `user_name` to **impersonate a colleague** — comment authorship is a plain client-supplied `text` column ([schema.sql:139](supabase/schema.sql#L139)), not a FK to `auth.users`

This currently has limited practical impact only because §2.1 means these tables are empty. **The moment you wire up real persistence, this becomes the primary hole.** Fix it in the same change.

**Fix — membership-scoped policies + real foreign keys:**

```sql
-- 1. Model membership explicitly
create table public.workspace_members (
  workspace_id text references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  primary key (workspace_id, user_id)
);
alter table public.workspace_members enable row level security;

-- 2. Scope boards to members
drop policy if exists "Allow authenticated all on boards" on public.boards;

create policy "members read boards" on public.boards for select
  using (exists (
    select 1 from public.workspace_members m
    where m.workspace_id = boards.workspace_id and m.user_id = auth.uid()
  ));

create policy "members write boards" on public.boards for insert
  with check (exists (
    select 1 from public.workspace_members m
    where m.workspace_id = boards.workspace_id and m.user_id = auth.uid()
  ));
-- repeat update/delete; for tasks/columns, join through board_id
```

Separately, tighten the schema so authorship can't be forged:

```sql
alter table public.task_comments
  alter column user_id type uuid using user_id::uuid,
  alter column user_id set default auth.uid();
alter table public.task_comments
  add constraint task_comments_user_fk foreign key (user_id) references auth.users(id);
-- then drop the denormalized user_name / user_avatar columns and join profiles instead
```

Apply the same `uuid` + FK treatment to `notifications.recipient_id`, `notifications.sender_id`, `activity_logs.user_id`, `tasks.assignee_id`, and `task_attachments.uploaded_by` — all are currently free-text.

---

### 1.5 🟠 HIGH — There is no authorization layer at all

A grep for admin checks across the whole of `src/` returns **five hits, and every one is cosmetic** — four render a coloured "Admin" badge, one gates a comment-delete button:

| Location | What it does |
|---|---|
| [UsersView.tsx:379](src/components/users/UsersView.tsx#L379), [:829](src/components/users/UsersView.tsx#L829) | badge colour |
| [SettingsView.tsx:563](src/components/settings/SettingsView.tsx#L563) | badge colour |
| [ProfileView.tsx:361](src/components/profile/ProfileView.tsx#L361) | badge colour |
| [TaskModal.tsx:572](src/components/tasks/TaskModal.tsx#L572) | comment delete button |

Meanwhile [/users](src/components/users/UsersView.tsx) — add users, change anyone's role, delete users — is reachable by **every** authenticated member, with an "Add User" button rendered unconditionally ([:290](src/components/users/UsersView.tsx#L290)). The `/settings` Danger Zone ([SettingsView.tsx:596](src/components/settings/SettingsView.tsx#L596)) is likewise ungated.

Note the fix is *both* layers: hiding the button is UX, the server check is the actual control.

```tsx
// src/components/common/RequireAdmin.tsx
export const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useApp();
  if (currentUser?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
```

```tsx
// src/App.tsx
<Route path="/users" element={<RequireAdmin><UsersView /></RequireAdmin>} />
```

---

### 1.6 🟠 HIGH — Storage buckets are world-readable and world-deletable

[schema.sql:218-224](supabase/schema.sql#L218-L224):

```sql
values ('attachments','attachments', true), ('avatars','avatars', true)
on conflict (id) do update set public = true;   -- forces public even if you fixed it
```

- `public = true` means **anyone with the URL can read any attachment**, unauthenticated. For a task tracker holding internal documents, that is a data-exposure risk. Worse, the `do update set public = true` line silently re-opens the bucket every time the schema is re-run, undoing any manual fix.
- The delete policy checks only `auth.role() = 'authenticated'` — **any member can delete every file in both buckets**, including other people's avatars.

**Fix:**

```sql
insert into storage.buckets (id, name, public)
values ('attachments','attachments', false), ('avatars','avatars', true)
on conflict (id) do nothing;          -- do not clobber configured state

-- serve attachments via short-lived signed URLs from the client:
--   supabase.storage.from('attachments').createSignedUrl(path, 60)

create policy "owner deletes own objects" on storage.objects for delete
  using (bucket_id in ('attachments','avatars') and owner = auth.uid());
```

`avatars` can stay public; `attachments` should not be.

---

### 1.7 🟡 MEDIUM — `SECURITY DEFINER` without a pinned `search_path`

[schema.sql:64](supabase/schema.sql#L64) — `handle_new_user` runs as its owner (superuser-adjacent) but does not pin `search_path`. This is the classic Postgres search-path hijack pattern and is flagged by Supabase's own database linter.

```sql
$$ language plpgsql security definer set search_path = public, pg_temp;
```

---

### 1.8 🟡 MEDIUM — Missing config silently becomes local admin

[AuthContext.tsx:238-248](src/context/AuthContext.tsx#L238-L248): if `isSupabaseConfigured` is false, `signIn` accepts **any email and any password** and grants `role: 'admin'`. A build shipped with a missing or typo'd env var doesn't fail loudly — it deploys an app where anyone types anything and lands in as an administrator.

The same fallback exists in `signUp` ([:290](src/context/AuthContext.tsx#L290)). Delete both branches, or hard-gate them:

```ts
const ALLOW_LOCAL_FALLBACK = import.meta.env.DEV;
if (!ALLOW_LOCAL_FALLBACK) throw new Error('Supabase is not configured');
```

Better still, fail the build when the vars are absent rather than degrading at runtime.

---

### 1.9 🟡 MEDIUM — The "secret" login path is not a security control

[App.tsx:22](src/App.tsx#L22) reads `VITE_SECRET_LOGIN_PATH`, and [App.tsx:100](src/App.tsx#L100) hardcodes `/access` as a permanent fallback. Two problems:

1. **`VITE_`-prefixed vars are compiled into the JS bundle.** The path is plaintext in `dist/assets/index-*.js` — anyone can read it with Ctrl+U. It is obfuscation, not authentication.
2. The previous value of that variable **is in git history** (commit `1e372b5`), so any old clone of the repo reveals it.
3. The `|| currentPath === '/access'` fallback means changing the env var doesn't actually close the old door.

This is fine as *anti-crawler noise* — just don't count it as a security layer, and drop the hardcoded `/access` fallback so rotating the value actually works.

---

### 1.10 🟢 LOW — Cron endpoint auth is optional

[api/keep-alive.ts:7-10](api/keep-alive.ts#L7-L10) only enforces `CRON_SECRET` **if it happens to be set**. `.env.example` labels it `optional-random-cron-secret`, so it likely isn't. The endpoint is low-value (it returns one workspace row) but it's a free unauthenticated DB query. Make the secret required in production and note it returns `data` in the response body — drop that field.

---

### 1.11 🟢 LOW — Password policy and generator

- Minimum length is **6 characters** ([ResetPasswordView.tsx:42](src/components/auth/ResetPasswordView.tsx#L42)). Raise to 12, and enable Supabase's built-in leaked-password (HIBP) check in Auth settings.
- [UsersView.tsx:143-152](src/components/users/UsersView.tsx#L143-L152) generates temp passwords with `Math.random()`, which is not cryptographically secure. Use `crypto.getRandomValues()`:

```ts
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  const bytes = crypto.getRandomValues(new Uint32Array(16));
  setNewPassword(Array.from(bytes, b => chars[b % chars.length]).join(''));
  setShowPassword(true);
};
```

- The generated password is displayed on screen and never force-rotated on first login. Consider setting `has_set_password: false` and requiring a change.

### 1.12 🟢 LOW — No security headers

[vercel.json](vercel.json) sets no headers. Add CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and HSTS. Note that inline `data:` attachment rendering (§2.2) will constrain your CSP — another reason to move to Supabase Storage first.

---

## 2. ⚙️ Functionality findings

### 2.1 🔴 THE BIG ONE — This is a single-player app pretending to be collaborative

**Every feature except login and profile is `localStorage`-only.** Verified by grepping all Supabase table access in `src/` — there are exactly seven calls and **all seven touch `profiles`**:

| Table | Schema exists? | Used by the app? |
|---|---|---|
| `profiles` | ✅ | ✅ read/write |
| `workspaces` | ✅ | ❌ never |
| `boards` | ✅ | ❌ never |
| `columns` | ✅ | ❌ never |
| `tasks` | ✅ | ❌ never |
| `task_comments` | ✅ | ❌ never |
| `task_attachments` | ✅ | ❌ never |
| `notifications` | ✅ | ❌ never |
| `activity_logs` | ✅ | ❌ never |

[AppContext.tsx:88-97](src/context/AppContext.tsx#L88-L97) defines eight `localStorage` keys, and [:246-278](src/context/AppContext.tsx#L246-L278) persists all app state there. `supabaseClient` is never imported into `AppContext.tsx` at all.

**Consequences, in plain terms:**

- 🚫 **Two users never see the same board.** Everyone gets their own private copy seeded from [initialData.ts](src/data/initialData.ts).
- 🚫 **Notifications can never be delivered.** [`notifyUser`](src/context/AppContext.tsx#L306) writes the notification into the *sender's* own browser storage. The recipient's browser is never touched. The entire notifications feature is decorative.
- 🚫 **Task assignment is meaningless** — you assign work to a user record that only exists in your own browser.
- 🚫 **Clearing site data destroys everything.** There is no backup, no export, no server copy.
- 🚫 **Switching browser or device = empty workspace**, while still logged in — which will read to users as data loss.
- 🚫 **Adding a user in `/users` adds them to your local list only** ([UsersView.tsx:172](src/components/users/UsersView.tsx#L172)) — the auth account is created in Supabase, but when they log in they'll see *their* empty localStorage, not your workspace.

This is the single most important thing to fix, and it is a substantial piece of work: `AppContext` needs to become an async, server-backed data layer. See §5.

---

### 2.2 🟠 HIGH — Files are base64'd into localStorage; quota exhaustion is inevitable

Three upload paths read files as **data URLs** and store them in React state that is mirrored to `localStorage`:

| Where | Limit accepted | Location |
|---|---|---|
| Task attachments | 10 MB | [TaskModal.tsx:214-231](src/components/tasks/TaskModal.tsx#L214-L231) |
| Profile photo | 5 MB | [ProfileView.tsx:79-103](src/components/profile/ProfileView.tsx#L79-L103) |
| User avatars | 5 MB | [UsersView.tsx:127-141](src/components/users/UsersView.tsx#L127-L141) |

Base64 inflates by ~33%, so **a single 10 MB attachment becomes ~13.3 MB** — against a `localStorage` budget of 5–10 MB per origin. The write in [AppContext.tsx:266](src/context/AppContext.tsx#L266) is a bare `localStorage.setItem` inside a `useEffect` with **no `try/catch`**. On overflow it throws `QuotaExceededError`, React surfaces it, and — because the throw happens in an effect during commit — **the user loses the write and can land on the ErrorBoundary screen.** One large attachment can brick the workspace.

The Supabase Storage buckets that would solve this **already exist in the schema and are never used** ([schema.sql:218](supabase/schema.sql#L218)).

**Fix — upload to Storage, persist only the path:**

```ts
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !task || !supabase) return;
  if (file.size > 10 * 1024 * 1024) return alert('File size exceeds 10MB limit.');

  const path = `${task.id}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from('attachments').upload(path, file);
  if (error) return alert(`Upload failed: ${error.message}`);

  addAttachment(task.id, { name: file.name, size: file.size, type: file.type, url: path });
  e.target.value = '';
};
```

…then resolve `path` → signed URL at render time. As an interim safety net regardless, wrap every persistence effect:

```ts
const safeSet = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.error('Storage quota exceeded', e); /* surface a toast */ }
};
```

---

### 2.3 🟠 HIGH — The "invite member" flow doesn't invite anyone

[AuthContext.tsx:383-403](src/context/AuthContext.tsx#L383-L403) — `inviteMember` **never creates a user**. It calls `resetPasswordForEmail` on an address that has no account. Supabase deliberately returns success for unknown emails (user-enumeration protection), so:

- `emailSent` is set to `true`
- [UsersView.tsx:203](src/components/users/UsersView.tsx#L203) reports `"sent invitation email to …"`
- **No email is sent. No account exists. The person can never log in.**

The function also accepts `role` and `jobTitle` and discards both.

**Fix** — route invites through the (now-authenticated) admin endpoint using `inviteUserByEmail`:

```ts
// api/create-user.ts, after the admin check — when no password was supplied
const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
  data: { full_name: cleanName, job_title: cleanTitle },
  redirectTo: `${process.env.PUBLIC_SITE_URL}/set-password`,
});
```

---

### 2.4 🟠 HIGH — Failed user creation is reported as success

[AuthContext.tsx:444-456](src/context/AuthContext.tsx#L444-L456):

```ts
} catch (err: any) {
  console.warn('Error calling /api/create-user:', err);
  return {
    error: null,                                    // ← swallows the failure
    user: { id: `user-${Date.now()}`, ... },        // ← fabricates a user object
  };
}
```

If the network call fails, this **returns `error: null` and invents a fake user**. The caller at [UsersView.tsx:164](src/components/users/UsersView.tsx#L164) sees no error, adds the phantom user to the local list, and shows *"created in Supabase with password!"* — for an account that does not exist. Return the real error.

---

### 2.5 🟠 HIGH — `/set-password` is a permanent trap

[App.tsx:36-56](src/App.tsx#L36-L56) sets a **sticky** `localStorage` flag, `kf_require_password_setup`, whenever the path is `/set-password` — and [:76-79](src/App.tsx#L76-L79) then gates the *entire app* on that flag before the auth check runs:

```ts
const requirePassword =
  isPasswordRecovery ||
  location.pathname === '/set-password' ||
  localStorage.getItem('kf_require_password_setup') === 'true';
if (requirePassword) return <ResetPasswordView … />;
```

Failure modes:

1. **Any visitor** who navigates to `/set-password` — a stray link, a bookmark, a crawler — permanently sets the flag and is locked to the reset screen forever.
2. With **no session**, `ResetPasswordView` renders anyway. `updateUser` fails, and the screen has **no "sign out" and no "back to login" escape hatch**. The only recovery is manually clearing site data.
3. The flag is cleared only on success ([:83](src/App.tsx#L83)) or sign-out ([AuthContext.tsx:317](src/context/AuthContext.tsx#L317)) — and sign-out is unreachable from that screen.

**Fix** — derive the gate from the session's recovery state rather than a sticky flag, require a session, and always offer an exit:

```ts
// only enter recovery mode from an actual Supabase recovery event
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
});

// and in the gate:
if (requirePassword && !user) return <Navigate to={SECRET_LOGIN_PATH} replace />;
```

Plus a "Sign out / Back to login" button inside `ResetPasswordView` unconditionally.

---

### 2.6 🟡 MEDIUM — Editing another user's role silently does nothing

[UsersView.tsx:227-250](src/components/users/UsersView.tsx#L227-L250) calls `updateMemberProfile`, which updates `profiles` filtered by the *target's* id ([AuthContext.tsx:461-478](src/context/AuthContext.tsx#L461-L478)). But RLS ([schema.sql:204](supabase/schema.sql#L204)) allows updates only where `auth.uid() = id`.

So the update matches **zero rows**. Supabase returns no error for a zero-row update, the code doesn't check the result, and the UI cheerfully reports *"Updated details & synced role to Supabase."* The local list changes; the database does not. Next login, the change is gone.

The mirror image of §1.2: you **can't** change other people's roles (even as an admin), but you **can** change your own. Exactly backwards. Fix by moving role changes to an authenticated admin API route and checking `count`:

```ts
const { error, count } = await supabase
  .from('profiles')
  .update(updates, { count: 'exact' })
  .eq('id', userId);
if (error || count === 0) throw new Error('Profile update was rejected');
```

---

### 2.7 🟡 MEDIUM — Profile email edits desynchronize the login

[ProfileView.tsx:135-143](src/components/profile/ProfileView.tsx#L135-L143) writes a new `email` into `profiles` but never calls `supabase.auth.updateUser({ email })`. The user changes their email in the UI, sees it reflected everywhere — and then **cannot log in with it**, because `auth.users.email` is unchanged. Either make the field read-only, or run the real email-change flow (which requires re-confirmation).

---

### 2.8 🟡 MEDIUM — Board-ID migration can collide and drops data

[AppContext.tsx:186-232](src/context/AppContext.tsx#L186-L232) generates 8-char slugs with `Math.random()` and **never checks for collisions** against existing boards. It also rewrites `boards`, `columns`, `tasks`, and `notifications` — but **not `activityLogs`**, and column IDs keep their old `col-board-1-todo` shape while their `boardId` changes, leaving inconsistent identifiers.

The effect runs with `[]` deps but calls `navigate` from a stale closure. Use `crypto.randomUUID()` and verify uniqueness:

```ts
const makeSlug = () => crypto.randomUUID().replace(/-/g, '').slice(0, 8);
let newSlug = makeSlug();
while (existingIds.has(newSlug)) newSlug = makeSlug();
```

The same unchecked generator is used for every new board at [AppContext.tsx:339-343](src/context/AppContext.tsx#L339-L343) — with 26⁸ keyspace and a birthday bound, collisions become plausible in the low thousands of boards.

### 2.9 🟢 LOW — Assorted

- **Phantom seed board.** [initialData.ts:13](src/data/initialData.ts#L13) hardcodes board `pjxmtkwq` "Main Project Board", so every new browser fabricates a board that no one created.
- **Double navigation on board delete.** [AppContext.tsx:378-381](src/context/AppContext.tsx#L378-L381) calls both `setActiveBoardId(null)` and `setActivePage('boards')`, each of which calls `navigate` — two history entries for one action.
- **Activity log is silently capped at 50** ([AppContext.tsx:293](src/context/AppContext.tsx#L293)) with no pagination or "load more".
- **Comments are logged as `created_task`** ([AppContext.tsx:709](src/context/AppContext.tsx#L709)) — wrong action type, so the activity feed misreports.
- **`alert()` used for validation errors** in three upload handlers, while the rest of the app has a toast system. Inconsistent UX.
- **No `<meta name="description">`, no Open Graph tags** in [index.html](index.html).

---

## 3. 🧹 Code quality & maintainability

| Observation | Detail |
|---|---|
| ❌ **No tests** | Zero test files, no test runner in `package.json`. For an app with drag-and-drop reordering and role logic, this is the main source of future regressions. |
| ❌ **No linter or formatter** | No ESLint, no Prettier, no pre-commit hook. |
| ❌ **No CI** | No `.github/workflows`. Nothing prevents a broken build reaching `main`. |
| ⚠️ **God-object context** | [AppContext.tsx](src/context/AppContext.tsx) is 879 lines exposing **44 values** in one provider. Every consumer re-renders on any state change anywhere. |
| ⚠️ **Oversized components** | `UsersView` 1030 lines, `TaskModal` 806, `SettingsView` 647. Each mixes data access, modal state, and presentation. |
| ⚠️ **`any` at the boundaries** | `session: any`, `syncUserProfile(supabaseUser: any)`, `handler(req: any, res: any)`. `strict: true` is on but bypassed exactly where type-safety matters most. |
| ⚠️ **Errors swallowed** | ~12 `catch { }` / `console.warn` blocks that discard failures without surfacing them. §2.4 is the worst case, but the pattern is systemic. |
| ⚠️ **715 KB single bundle** | 190 KB gzipped, one chunk, Vite warns on build. No route-level code splitting. |
| ⚠️ **Dead code shipped** | `2.0/` and `3.0/` directories carry full duplicate apps with their own `node_modules`. Gitignored, but they bloat the working tree. |
| ⚠️ **BOM-prefixed files** | `AuthContext.tsx`, `create-user.ts`, `schema.sql`, `initialData.ts`, `ResetPasswordView.tsx` start with a UTF-8 BOM — harmless here, but noise in diffs. |
| ✅ **Consistent styling** | Tailwind usage is disciplined and the visual design is genuinely strong. |
| ✅ **`ErrorBoundary` exists** | [ErrorBoundary.tsx](src/components/common/ErrorBoundary.tsx) wraps the route outlet — good instinct. |

---

## 4. 📊 Stack rating

### Current stack

| Layer | Choice | Grade | Comment |
|---|---|---|---|
| **UI** | React 18.3 + TypeScript 5.7 | 🟢 **A−** | Correct default. React 19 is out but 18 is fine and stable; no reason to rush. |
| **Build** | Vite 6 | 🟢 **A** | Best-in-class. Nothing to change. |
| **Styling** | Tailwind 3.4 | 🟢 **A−** | Excellent fit. v4 is available and roughly 5× faster to build, but v3 is well-supported. |
| **Routing** | React Router 7.18 | 🟢 **A−** | Current. You're using it in library mode, which is the right call here. |
| **Backend** | Supabase (Postgres + Auth + Storage) | 🟢 **A** | Ideal for this app — the schema is well-designed, it's just unused. |
| **Hosting** | Vercel + serverless functions + cron | 🟢 **A−** | Good match. Cron keep-alive is a sensible free-tier workaround. |
| **Drag & drop** | `@hello-pangea/dnd` 17 | 🟡 **B** | Works and is the maintained `react-beautiful-dnd` fork, but it's in maintenance mode and has no touch-friendly/a11y story compared to `dnd-kit`. |
| **State management** | Two React Contexts + `localStorage` | 🔴 **D** | **The weak link.** No server sync, no caching, no optimistic updates, no invalidation, no realtime. |
| **Data fetching** | Hand-rolled `async` in components | 🔴 **D** | No dedup, no retries, no loading/error states, no cache. |
| **Testing** | None | 🔴 **F** | — |
| **Tooling** | No lint / format / CI | 🔴 **F** | — |

**Composite: 🟡 B− for tool selection, 🔴 D for how they're wired together.**

The honest summary: **you picked the right tools and then didn't use the backend.** Almost every problem in §1 and §2 traces back to the fact that Supabase is present but bypassed.

### 4.1 Recommended changes

#### 🥇 High value, low disruption

| Add | Why | Effort |
|---|---|---|
| **TanStack Query v5** | Replaces the whole hand-rolled data layer. Caching, retries, optimistic updates, and loading/error states for free. This is the single highest-leverage addition — it makes §2.1 tractable instead of grim. | ~1 day |
| **Zod** | Validate `/api/*` request bodies and Supabase responses at the boundary. Kills the `any` usage and closes input-validation gaps. | ~2 h |
| **ESLint + Prettier + `lint-staged`** | Would have caught several swallowed errors and unused variables. | ~1 h |
| **Vitest + Testing Library** | Start with `moveTask` reorder logic and the role/permission checks — the two places bugs cost the most. | ~half day |
| **GitHub Actions** | `tsc --noEmit` + lint + test on every PR. | ~30 min |

#### 🥈 Worth doing

| Change | Why |
|---|---|
| **`dnd-kit`** instead of `@hello-pangea/dnd` | Actively developed, far better touch and keyboard/screen-reader support. Kanban is exactly its use case. |
| **Zustand** for ephemeral UI state | Modal state, sidebar state, filters. Lets `AppContext` shrink to server data only and stops the whole tree re-rendering. |
| **Supabase Realtime** | With §2.1 fixed, `supabase.channel('tasks').on('postgres_changes', …)` makes boards live-update across users — the feature the UI already implies exists. |
| **`supabase/migrations/`** | Replace the single re-runnable `schema.sql` with versioned migrations via the Supabase CLI. The current file uses bare `create policy`, so **re-running it errors out** on existing policies — it isn't actually idempotent despite the `if not exists` on tables. |
| **Sentry** (or similar) | You currently have no visibility into production errors at all. |

#### 🥉 Optional / later

- **Tailwind v4** — meaningfully faster builds, but a migration.
- **Route-level `React.lazy`** — splits the 715 KB bundle.
- **Next.js** — only if you later want SSR/SEO. For an authenticated internal tool, Vite + React is the better fit; **don't migrate.**

---

## 5. 🗺️ Prioritized remediation plan

### 🚨 Phase 0 — Before this is publicly reachable (hours)

1. **Add auth + admin check to `/api/create-user`** (§1.1) — this is remotely exploitable *right now*.
2. **Add the role-escalation trigger** on `profiles` (§1.2).
3. **Remove `raw_user_meta_data->>'role'`** from `handle_new_user`; confirm public signup is disabled (§1.3).
4. **Pin `search_path`** on the `SECURITY DEFINER` function (§1.7).
5. **Audit existing rows:** `select id, email, role from profiles where role = 'admin';` — given §1.1 has been live, verify every admin is one you created.

### 🔥 Phase 1 — Correctness (days)

6. **Gate `/users` and Settings→Danger Zone behind `RequireAdmin`** (§1.5).
7. **Fix the `/set-password` trap** (§2.5) — highest-frequency user-facing bug.
8. **Stop faking success** in `createMemberWithPassword` (§2.4) and `updateMemberProfile` (§2.6).
9. **Replace the broken invite flow** with `inviteUserByEmail` (§2.3).
10. **Wrap every `localStorage.setItem` in `try/catch`** as a stopgap against §2.2.
11. **Remove the local auth-bypass fallback** (§1.8).

### 🏗️ Phase 2 — Make it actually multi-user (1–2 weeks)

12. **Introduce TanStack Query** and migrate `AppContext` table by table: `boards` → `columns` → `tasks` → `comments` → `notifications` → `activity_logs`.
13. **Write real RLS policies** with a `workspace_members` table (§1.4), and convert the free-text `user_id` columns to `uuid` FKs.
14. **Move attachments and avatars to Supabase Storage**; make the `attachments` bucket private with signed URLs (§1.6, §2.2).
15. **Add Supabase Realtime subscriptions** so boards sync live.
16. **Keep `localStorage` as an offline cache only** — never as the source of truth.

### ✨ Phase 3 — Hardening & polish (ongoing)

17. ESLint + Prettier + Vitest + GitHub Actions.
18. Security headers in `vercel.json` (§1.12); raise password minimum to 12 and enable HIBP checks (§1.11).
19. Split `UsersView` / `TaskModal` / `SettingsView`; add route-level code splitting.
20. Migrate to `dnd-kit`; move to versioned Supabase migrations; add Sentry.

---

## 6. 🎯 The one-paragraph version

KanbanFlow has a polished, well-crafted React front end sitting on top of a backend it never actually calls. A correct and reasonably well-designed Supabase schema exists, but only the `profiles` table is used — every board, task, comment, attachment, and notification lives in the individual user's `localStorage`, which means the app's central promise (team collaboration) does not function, and notifications are structurally undeliverable. Layered on top of that are three critical auth holes: a **completely unauthenticated public endpoint that mints admin accounts**, an RLS policy that lets any member **promote themselves to admin**, and a signup trigger that **trusts a client-supplied role claim**. Fix the three auth holes today; then spend the next sprint moving the data layer to Supabase with TanStack Query and real membership-scoped RLS. The stack you chose is a good one — it just needs to be plugged in.

---

# 7. ✅ Remediation checklist

**Original audit:** `121231b` · **Re-verified against:** `a899943` (2026-08-31, 2nd pass)
Every row was **re-checked against the current code**, not assumed from commit messages.

**Commits landed since the audit:** `1d8af6b` · `f1a5a3d` · `54df0a0` · `6a849fc` · `5999c20` · `fea8606` · `a899943`

| Status | Meaning |
|---|---|
| ✅ | Verified fixed in the current code |
| 🟨 | Partially fixed — main risk reduced, a real gap remains |
| ❌ | Not addressed |
| ⛔ | **Regression** — was fixed, is now broken again |

---

## 7.1 🔐 Security

| # | Finding | Sev | Status | Evidence / what remains |
|---|---|---|---|---|
| 1.1 | Unauthenticated API creates admin users | 🔴 | ✅ **Fixed** | [create-user.ts:26-52](api/create-user.ts#L26-L52) — Bearer JWT verified via `auth.getUser(token)`, then `profiles.role === 'admin'` enforced. Fails closed. |
| 1.2 | Any user can self-promote to `admin` | 🔴 | ✅ **Fixed** | `prevent_role_self_escalation` BEFORE UPDATE trigger ([schema.sql:85-107](supabase/schema.sql#L85-L107)) + `with check (auth.uid() = id)` ([:265](supabase/schema.sql#L265)). |
| 1.3 | Signup metadata sets your own role | 🔴 | ✅ **Fixed** | [schema.sql:41-45](supabase/schema.sql#L41-L45) — hardcodes `'member'`; the metadata read is gone. |
| 1.4 | RLS = any authenticated user owns every row | 🟠 | 🟨 **Partial** | ✅ `notifications` now recipient-scoped ([:275-278](supabase/schema.sql#L275-L278)) — closes the cross-user notification leak. ✅ `workspaces` read-all + admin-modify. ❌ **`boards`, `columns`, `tasks`, `task_comments`, `task_attachments`, `activity_logs` are still `for all using (auth.role() = 'authenticated')`** ([:270-274](supabase/schema.sql#L270-L274), [:281](supabase/schema.sql#L281)). Any member can still delete every board in the workspace or forge `user_id` on a comment. **Still the top security item.** |
| 1.5 | No admin authorization on privileged views | 🟠 | 🟨 **Partial** | ✅ `/users` guarded ([App.tsx:131-136](src/App.tsx#L131-L136)). ❌ **`/settings` is still ungated** — and it has grown: it now creates users ([SettingsView.tsx:117](src/components/settings/SettingsView.tsx#L117)), removes members ([:185](src/components/settings/SettingsView.tsx#L185)), and sends password-setup links ([:510](src/components/settings/SettingsView.tsx#L510)). A one-line fix that matters more than it did last pass. |
| 1.6 | Storage buckets public + world-deletable | 🟠 | ⛔ **Regressed** | ✅ Delete policy now scoped to `owner = auth.uid() or is_admin()` ([:303](supabase/schema.sql#L303)). ⛔ But the bucket config reverted to `('attachments', 'attachments', true)` **and** the clobbering `on conflict (id) do update set public = true` is back ([:291-293](supabase/schema.sql#L291-L293)). Attachments are world-readable by URL again, and that line re-opens the bucket on every schema run. The `Read attachments` policy requiring `authenticated` is decorative while `public = true`. |
| 1.7 | `SECURITY DEFINER` without pinned `search_path` | 🟡 | ✅ **Fixed** | Pinned on all three functions ([:31](supabase/schema.sql#L31), [:89](supabase/schema.sql#L89), [:242](supabase/schema.sql#L242)). |
| 1.8 | Missing config silently grants local admin | 🟡 | ✅ **Fixed** | [AuthContext.tsx:234](src/context/AuthContext.tsx#L234) returns a real error; the `mockUser` admin fallback is gone. |
| 1.9 | Secret login path is obscurity, and it leaked | 🟡 | ❌ **Not fixed** | [App.tsx:91](src/App.tsx#L91) still hardcodes the `/access` fallback, so rotating `VITE_SECRET_LOGIN_PATH` doesn't close the old door. Low priority. |
| 1.10 | Cron endpoint auth is opt-in | 🟢 | ❌ **Not fixed** | [keep-alive.ts:7](api/keep-alive.ts#L7) — still `if (cronSecret && …)`. Now also prefers the **service-role key** ([:12](api/keep-alive.ts#L12)), so an unauthenticated hit runs with full privileges. Slightly worse. |
| 1.11 | Weak password policy / `Math.random()` | 🟢 | 🟨 **Partial** | ✅ CSPRNG generator. ✅ Minimum 6 → **8** ([ResetPasswordView.tsx:42](src/components/auth/ResetPasswordView.tsx#L42)). ❌ Recommended 12 + Supabase HIBP check — neither done. |
| 1.12 | No security headers | 🟢 | 🟨 **Partial** | ✅ `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` added ([vercel.json](vercel.json)). ❌ No CSP, no HSTS. |

**Security: 5 fixed · 4 partial · 2 open · 1 regression**

---

## 7.2 ⚙️ Functionality

| # | Finding | Sev | Status | Evidence / what remains |
|---|---|---|---|---|
| 2.1 | **App is `localStorage`-only; not collaborative** | 🔴 | ✅ **Fixed** | Full Postgres read/write path via `fetchRemoteWorkspaceData` ([AppContext.tsx:227](src/context/AppContext.tsx#L227)) + Realtime. `localStorage` demoted to a cache. |
| 2.2 | Files base64'd into `localStorage` → quota crash | 🟠 | 🟨 **Partial** | ✅ All writes wrapped in `safeStorageSave`. ✅ Storage upload path in all three uploaders. ❌ **The `readAsDataURL` fallback still fires on upload failure** in all three ([TaskModal.tsx:260](src/components/tasks/TaskModal.tsx#L260), [ProfileView.tsx:126](src/components/profile/ProfileView.tsx#L126), [UsersView.tsx:165](src/components/users/UsersView.tsx#L165)). ❌ `safeStorageSave` still swallows failures silently. |
| 2.3 | "Invite member" invites nobody | 🟠 | ✅ **Fixed** | Routed through the authenticated admin API using `auth.admin.inviteUserByEmail` ([create-user.ts:114-127](api/create-user.ts#L114-L127)). |
| 2.4 | Failed user creation reported as success | 🟠 | ✅ **Fixed** | Catch returns `{ error: err }` instead of fabricating a user. |
| 2.5 | `/set-password` is a permanent trap | 🟠 | ✅ **Fixed** | [App.tsx:33-48](src/App.tsx#L33-L48) — the effect now triggers **only** on a real recovery/invite hash. The sticky `localStorage` write driven by `pathname` is gone, and `onCancel` provides an exit. *(Minor: the `requirePassword` check at [:67-68](src/App.tsx#L67-L68) still reads the legacy flag — now dead code, harmless.)* |
| 2.6 | Editing another user's role silently does nothing | 🟡 | ✅ **Fixed** | New `Allow admin update on profiles` policy using `public.is_admin()` ([schema.sql:266](supabase/schema.sql#L266)) lets admins update other rows; the `guard_profile_role` trigger still blocks non-admins. `updateMemberProfile` returns real errors. |
| 2.7 | Profile email edits desynchronize login | 🟡 | ✅ **Fixed** | [ProfileView.tsx:157-159](src/components/profile/ProfileView.tsx#L157-L159) — `authPayload.email` is now set, so `auth.updateUser` changes the real login email. |
| 2.8 | Board-ID slug collisions | 🟡 | 🟨 **Partial** | ✅ CSPRNG slugs. ❌ Still no uniqueness check ([AppContext.tsx:599](src/context/AppContext.tsx#L599)). Low risk at current scale. |
| 2.9a | `resetToDefaultData()` crash | 🟢 | ✅ **Fixed** | No longer touches `initialUsers[0]`. |
| 2.9b | Phantom seed board in every browser | 🟢 | ✅ **Fixed** | [initialData.ts](src/data/initialData.ts) — `initialBoards` and `initialColumns` are now `[]`. |
| 2.9c | Wrong activity action types | 🟢 | ❌ **Not fixed** | Still miscategorised — `deleteTask` logs as `created_task` ([AppContext.tsx:914](src/context/AppContext.tsx#L914)), so the feed reports deletions as creations. |
| 2.9d | `alert()` for validation errors | 🟢 | ❌ **Not fixed** | Still used in 5+ places while the rest of the app uses toasts. |
| 2.9e | No meta description / OG tags | 🟢 | ✅ **Fixed** | [index.html](index.html) now carries description + OG tags. |

**Functionality: 8 fixed · 3 partial · 2 open**

---

## 7.3 🆕 Issues introduced by the fixes

| # | Sev | Issue | Status |
|---|---|---|---|
| **A** | 🔴 | All `storage.objects` policies deleted → uploads broken | ✅ **Fixed** — four policies restored ([schema.sql:300-303](supabase/schema.sql#L300-L303)). *But see 1.6: the bucket was made public again to achieve it, rather than using signed URLs.* |
| **B** | 🔴 | Realtime feedback loop breaks drag-and-drop | ✅ **Fixed**, and fixed well — on all four fronts: self-echo filter ([AppContext.tsx:479](src/context/AppContext.tsx#L479)), drag guard with queued refetch ([:484-487](src/context/AppContext.tsx#L484-L487)), 300 ms debounce ([:492](src/context/AppContext.tsx#L492)), per-table subscriptions ([:500-503](src/context/AppContext.tsx#L500-L503)). `moveTask` now upserts **all** reindexed siblings ([:990-994](src/context/AppContext.tsx#L990-L994)), and `BoardDetailView` wires `onDragStart`/`onDragEnd` ([:216-218](src/components/boards/BoardDetailView.tsx#L216-L218)). |
| **C** | 🟠 | ⛔ **NEW REGRESSION — `Cache-Control` headers deleted from `vercel.json`** | `1d8af6b` added them to fix a white-screen cause; `5999c20` ("remove UTF-8 BOM") dropped both entries and `a899943` did not restore them. Verified: `1d8af6b`→2 entries, `6a849fc`→2, `5999c20`→**0**, `a899943`→**0**. **The stale-`index.html` white screen is back** — see [WHITE-SCREEN-BUG.md](WHITE-SCREEN-BUG.md) §5. |

### Fix for regression C — restore into the `headers` array in `vercel.json`

```json
{ "source": "/(.*)",        "headers": [{ "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }] },
{ "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }
```

### Fix for regression 1.6 — keep attachments private

```sql
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false), ('avatars', 'avatars', true)
on conflict (id) do nothing;   -- never `do update set public = true`
```

Then swap `getPublicUrl` → `createSignedUrl(path, 60)` in [TaskModal.tsx:233](src/components/tasks/TaskModal.tsx#L233).

---

## 7.4 🧹 Code quality & stack

| Item | Status | Note |
|---|---|---|
| Dependency vulnerabilities | ✅ **Clean** | `npm audit` → 0 of 221 |
| `tsc --noEmit` under `strict` | ✅ **Passes** | Verified at `a899943` |
| Production build | ✅ **Passes** | 729.55 KB / one chunk |
| Secrets hygiene | ✅ **Clean** | Service-role key server-only, absent from `dist/` |
| Root `ErrorBoundary` | ✅ **Present** | [main.tsx:12](src/main.tsx#L12) |
| UTF-8 BOMs | ✅ **Removed** | `5999c20` — fixed the Vercel parser failure |
| Cache headers | ⛔ **Regressed** | See regression C |
| Schema re-runnable | ✅ **Fixed** | Now uses `drop policy if exists` before each `create policy` |
| Tests | ❌ **None** | Still zero test files, no runner |
| ESLint / Prettier | ❌ **None** | — |
| CI (GitHub Actions) | ❌ **None** | Nothing caught regression C |
| Bundle splitting | ❌ **Not done** | 715 → 729 KB; Vite still warns |
| `AppContext` size | ❌ **Worse** | 879 → **1450 lines** (+65%) |
| TanStack Query / Zod / Zustand | ❌ **Not adopted** | — |

---

## 7.5 📈 Score movement

| Area | `121231b` | `c6009d4` | `a899943` | Δ |
|---|---|---|---|---|
| Security | 🔴 **F** | 🟠 **C** | 🟠 **C+** | ▲ RLS partly scoped, headers added; held back by 6 open tables + bucket regression |
| Functionality | 🔴 **D** | 🟡 **C+** | 🟢 **B** | ▲▲ 8 of 13 fully fixed; drag-and-drop works properly now |
| Architecture | 🟠 **C−** | 🟡 **C+** | 🟡 **B−** | ▲ Realtime done correctly, with guards |
| Code quality | 🟡 **C+** | 🟡 **C** | 🟡 **C** | ◆ Still no tests/lint/CI; `AppContext` up 65% |
| Stack choice | 🟢 **B+** | 🟢 **B+** | 🟢 **B+** | ◆ Unchanged |

**Overall: 13 fixed · 7 partial · 4 open · 2 regressions.** Both original critical clusters — the three auth holes and "not actually a team app" — are closed. Drag-and-drop is genuinely fixed, and fixed properly rather than papered over.

---

## 7.6 🎯 What to do next, in order

| # | Task | Why now |
|---|---|---|
| 1 | **Restore the two `Cache-Control` entries** (regression C) | One paste. A live white-screen cause is back. |
| 2 | **Make `attachments` private again + `createSignedUrl`** (regression 1.6) | Every task attachment is currently readable by anyone with the URL |
| 3 | **Membership-scoped RLS for the remaining 6 tables** (§1.4) | Any member can still delete every board and forge comment authorship |
| 4 | **Guard `/settings` with `RequireAdmin`** (§1.5) | One line; it now creates users and sends password links |
| 5 | Remove `readAsDataURL` fallbacks; surface storage failures (§2.2) | Silent data loss |
| 6 | Require `CRON_SECRET` (§1.10) | It now runs with the service-role key |
| 7 | **Add ESLint + Vitest + CI** (§3) | Nothing caught regression C — this is the recurring theme |
| 8 | CSP + HSTS (§1.12), password ≥ 12 + HIBP (§1.11), activity action types (§2.9c) | Cheap cleanup |
| 9 | Adopt TanStack Query (§4.1) | Would shrink the 1450-line `AppContext` and prevent this class of bug |
