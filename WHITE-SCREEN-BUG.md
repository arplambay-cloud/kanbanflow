# White Screen on Task Drag — Root Cause Analysis

**Symptom:** dragging a task to another column (e.g. → *In Progress*) blanks the page completely. A **hard refresh** is required, after which the move is usually there.
**Investigated:** 2026-08-31 · **HEAD:** `c6009d4`

> ⚠️ **Read this first.** The code changed *while I was writing this.* My audit was against `121231b`; HEAD is now `c6009d4`. Antigravity has landed four commits that fix two of the three causes below — **and introduced a new one** that will reproduce the same white screen for a different reason. Details in §4.

---

## 1. 🎯 The short answer

There are **three separate white-screen mechanisms** in this app's history. Two are already fixed. The third is live in HEAD right now.

| # | Cause | Status at `c6009d4` |
|---|---|---|
| A | Uncaught error in `AppProvider` with **no ErrorBoundary above it** → React unmounts the entire root | ✅ Fixed by `1d8af6b` |
| B | Vercel serving a **stale cached `index.html`** pointing at deleted asset hashes | ✅ Fixed by `1d8af6b` |
| C | **Realtime refetch loop** rebuilds the drag tree mid-drag → `@hello-pangea/dnd` invariant throw | 🔴 **Live — newly introduced by `c6009d4`** |

The one that matches your description most precisely is **A**, and the reason it produced a *totally blank* page rather than the nice error card is the key insight below.

---

## 2. 🔬 Why it was a *white* screen and not the error card

This is the diagnostic that identifies where the bug lives, so it's worth spelling out.

React has three error-handling behaviours, and they are **not** the same:

| Where the error is thrown | What React does |
|---|---|
| In an **event handler** (`onClick`, `onDragEnd`) | ❌ **Not** caught by ErrorBoundaries. Logged to console, app keeps running. |
| In **render** or a **`useEffect`** | ✅ Caught by the nearest ErrorBoundary *above* it. |
| In render/effect with **no boundary above it** | 💀 React **unmounts the entire tree from the root** — leaving a literally empty `<div id="root">`. **A blank white page.** |

Now look at where the boundaries were at `121231b`, the version you were using:

```
main.tsx        BrowserRouter → AuthProvider → AppProvider → App     ← NO boundary here
  App.tsx         <ErrorBoundary> around <Routes> only               ← boundary starts here
    BoardDetailView  <ErrorBoundary> around board content
```

So:

- An error inside `TaskCard` or `BoardDetailView` → caught → **you'd see the friendly error card.**
- An error inside **`AppProvider`** → nothing above it → **root unmounts → pure white screen.**

**You saw a white screen, therefore the error was thrown inside `AppProvider` (or `AuthProvider`) — not in the board components.** That single deduction is why the earlier fix attempt didn't work.

---

## 3. 💣 Cause A — the crash inside `AppProvider` (your version)

At `121231b`, `AppContext.tsx` persisted state with **eight raw, unguarded writes**:

```ts
useEffect(() => {
  localStorage.setItem(LOCAL_STORAGE_KEYS.TASKS, JSON.stringify(tasks));
}, [tasks]);          // ← no try/catch, ×8
```

Dragging one task fires **two** of these, because `moveTask` also calls `logActivity`:

```
drag → setTasks()        → effect → setItem(kf_tasks_v3)     ← write #1
     → setActivityLogs() → effect → setItem(kf_activity_v3)  ← write #2
```

And at that time, **attachments and avatars were base64 data URLs stored inside those very objects** — a 10 MB attachment becomes ~13.3 MB of base64 against a 5–10 MB `localStorage` budget.

Once the quota is exceeded, `setItem` throws `QuotaExceededError` **inside a `useEffect` in `AppProvider`**, where nothing catches it → root unmount → white screen.

This explains **every** detail of your report, including the odd one:

> *"then I have to hard refresh, and then I see the state"*

Write #1 (`tasks`) succeeds and fills the remaining quota. Write #2 (`activity`) throws. So **the move was already saved** before the crash — which is exactly why the state is correct after you reload. A subtle detail that a guess wouldn't predict.

### Already fixed ✅

`AppContext.tsx:114` now wraps every write:

```ts
function safeStorageSave(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.warn('Storage quota exceeded or error writing ' + key, e); }
}
```

…and `main.tsx:12` now has a root boundary above the providers. Both correct.

### ⚠️ Still not fully fixed

The quota pressure is *reduced*, not removed — `safeStorageSave` silently swallows the failure, so **the app now fails to persist without telling anyone.** Worse, the base64 path is still reachable:

- [TaskModal.tsx:248-260](src/components/tasks/TaskModal.tsx#L248-L260) — Supabase Storage upload, but **falls back to `readAsDataURL` if the upload errors**, which is exactly what happens when the bucket rejects the write. A failed upload therefore refills `localStorage` with base64.
- [UsersView.tsx:141](src/components/users/UsersView.tsx#L141) — still **100% base64**, no Storage path at all.

**Recommended:** make the failure visible and drop the data-URL fallback entirely.

```ts
function safeStorageSave(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Persist failed for ' + key, e);
    // surface it — a silent no-op here reads to the user as data loss
    window.dispatchEvent(new CustomEvent('kf:storage-full', { detail: { key } }));
  }
}
```

---

## 4. 🔴 Cause C — the NEW bug in `c6009d4` (live right now)

This one will reproduce the same white screen, and it is **specific to dragging**.

[AppContext.tsx:456-465](src/context/AppContext.tsx#L456-L465):

```ts
const channel = client
  .channel('kanbanflow_realtime')
  .on('postgres_changes',
      { event: '*', schema: 'public' },   // ← every event, every table, no filter
      () => { fetchRemoteWorkspaceData(); })   // ← full 7-query workspace reload
  .subscribe();
```

There is **no table filter and no self-echo filter**. So the client reacts to *its own writes*.

### What one drag actually triggers

`moveTask` performs **two** database writes:

| Write | Location |
|---|---|
| `UPDATE tasks SET column_id, order` | [AppContext.tsx:934-941](src/context/AppContext.tsx#L934-L941) |
| `INSERT INTO activity_logs` | [AppContext.tsx:1226-1238](src/context/AppContext.tsx#L1226-L1238) (via `logActivity`) |

Each fires a `postgres_changes` event. Each event calls `fetchRemoteWorkspaceData()`, which runs **seven queries** and then calls `setBoards`, `setColumns`, `setTasks`, `setNotifications`, `setActivityLogs` — **replacing every array with brand-new object identities.**

```
1 drag
 └─ optimistic setTasks()                    → re-render #1
 └─ UPDATE tasks       → realtime echo → full refetch → 5 setState → re-render #2
 └─ INSERT activity    → realtime echo → full refetch → 5 setState → re-render #3
```

### Why that specifically breaks drag-and-drop

`@hello-pangea/dnd` keeps an internal registry of every `Droppable` and `Draggable` and asserts hard **invariants** against it. When a refetch lands while the drag is still settling, the entire `Droppable`/`Draggable` subtree is torn down and rebuilt underneath the library. It responds by throwing, with messages like:

```
Invariant failed: Cannot find droppable entry with id [col-...]
Invariant failed: Draggable[id]: could not find drag handle
```

Those throw **during render**, not in your event handler — so `handleDragEnd`'s `try/catch` at [BoardDetailView.tsx:113](src/components/boards/BoardDetailView.tsx#L113) **cannot catch them.** It only guards the synchronous call to `moveTask`.

At HEAD, the root boundary will now catch this and show the error card instead of a blank page — **but the drag still fails and the board still becomes unusable until you reload.** The white screen became an error card; the bug underneath is unchanged.

### Making it worse: `moveTask` only persists the moved task's order

[AppContext.tsx:934-941](src/context/AppContext.tsx#L934-L941) writes `order` for **one** task. But the local reindex recomputes `order` for **every sibling in both columns**, and those are never sent to the server.

So the refetch pulls back **stale sibling orders**, overwrites your correct local state, and the cards visibly jump back to their old positions. Persist the whole reindexed set:

```ts
const changed = updatedTasks.filter((t) =>
  t.columnId === sourceColumnId || t.columnId === targetColumnId
);

await client.from('tasks').upsert(
  changed.map((t) => ({
    id: t.id,
    board_id: t.boardId,
    column_id: t.columnId,
    order: t.order,
    updated_at: new Date().toISOString(),
  })),
  { onConflict: 'id' }
);
```

### The fix — three changes

**1. Don't refetch on your own writes.** Track an in-flight marker and ignore echoes:

```ts
const localWriteRef = useRef(0);

const markLocalWrite = () => {
  localWriteRef.current = Date.now();
};

// in the realtime handler:
() => {
  if (Date.now() - localWriteRef.current < 2000) return; // our own echo — skip
  fetchRemoteWorkspaceData();
}
```

Call `markLocalWrite()` at the top of `moveTask`, `createTask`, `updateTask`, `logActivity`, etc.

**2. Never refetch while a drag is in progress.** `DragDropContext` gives you the hook:

```tsx
const isDraggingRef = useRef(false);

<DragDropContext
  onDragStart={() => { isDraggingRef.current = true; }}
  onDragEnd={(result) => { isDraggingRef.current = false; handleDragEnd(result); }}
>
```

Expose that through context and have the realtime handler bail (queuing one refetch for after the drop) while `isDraggingRef.current` is true.

**3. Narrow the subscription and debounce it.** Subscribing to `event: '*'` on the whole `public` schema means a teammate's *notification read receipt* triggers a full 7-query reload for everyone. Subscribe per table, skip `activity_logs` entirely, and debounce:

```ts
const channel = client
  .channel('kanbanflow_realtime')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, onRemoteChange)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'columns' }, onRemoteChange)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'boards' }, onRemoteChange)
  .subscribe();
```

> **Better long-term:** apply the *delta* from the realtime payload (`payload.new` / `payload.old`) instead of re-downloading the entire workspace. Or adopt TanStack Query, where this is `queryClient.invalidateQueries` with built-in dedup — see the stack recommendation in [AUDIT-REPORT.md](AUDIT-REPORT.md).

---

## 5. 🌐 Cause B — the stale `index.html` (also fixed)

Worth knowing because it produces an **identical** blank page and is the classic reason a *hard* refresh specifically fixes things.

Vite emits content-hashed bundles (`index-CBiWzDHw.js`). If the CDN serves a **cached `index.html`** that references a hash from a previous deploy, the browser requests a file that no longer exists, the module fails to load, **React never boots at all**, and you get an empty `<div id="root">` — with no ErrorBoundary possible, because no JavaScript is running. A normal refresh re-serves the same cached HTML; only a hard refresh bypasses it.

The original [vercel.json](vercel.json) set no `Cache-Control` headers. It now does:

```json
{ "source": "/(.*)",        "headers": [{ "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }] },
{ "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }
```

Correct — HTML always revalidates, hashed assets cache forever. ✅

**Note:** this cause is *page-load*-triggered, not drag-triggered. If your white screens sometimes appeared right after a deploy rather than on a drag, that was this, not Cause A.

---

## 6. ⏱️ Confirm which one you're hitting — 60 seconds

The console tells you unambiguously. **Open DevTools → Console, keep it open, then drag a task.**

| Console output | Cause | Fix |
|---|---|---|
| `QuotaExceededError` / `Storage quota exceeded or error writing …` | **A** — storage full | §3 |
| `Invariant failed: Cannot find droppable entry…` | **C** — realtime loop | §4 |
| `Failed to load module script` / 404 on `/assets/index-*.js` | **B** — stale HTML | §5 |

Check how full your storage is — paste into the console:

```js
Object.keys(localStorage)
  .filter(k => k.startsWith('kf_'))
  .map(k => ({ key: k, kb: +(localStorage[k].length / 1024).toFixed(1) }))
  .sort((a, b) => b.kb - a.kb);

// total, against a ~5000 KB budget
(JSON.stringify(localStorage).length / 1024).toFixed(1) + ' KB used';
```

Anything approaching **5000 KB** confirms Cause A. If `kf_tasks_v3` or `kf_users_v3` dominates, you have base64 blobs in there.

**Emergency reset** (this deletes local board data — it is safe *only* now that Supabase is the source of truth at HEAD):

```js
Object.keys(localStorage).filter(k => k.startsWith('kf_')).forEach(k => localStorage.removeItem(k));
location.reload();
```

---

## 7. 🧩 Why the earlier fix attempt missed

Commit `64b31b8` — *"resolve blank white screen crash on board update, harden UserAvatar, TaskCard, and add ErrorBoundary"* — touched `TaskCard`, `UserAvatar`, `BoardDetailView`, `Header`, and added the `ErrorBoundary` component.

Every one of those is **below** `AppProvider` in the tree. The null-guards added to `TaskCard` and `UserAvatar` are good defensive code, but they were hardening components that were never throwing. The actual throw was in the provider's persistence effect, and the new boundaries were all placed underneath it — so they could never catch it.

That's the general lesson here: **a total white screen means the error escaped every boundary**, which localises it to the code *above* your topmost boundary. Adding boundaries lower down cannot help. The root boundary in `1d8af6b` was the correct move.

---

## 8. ✅ Recommended order of work

| Priority | Action | Section |
|---|---|---|
| 🔴 1 | Filter self-echoes out of the realtime handler | §4 fix 1 |
| 🔴 2 | Suppress refetch while a drag is in flight | §4 fix 2 |
| 🟠 3 | Persist **all** reindexed task orders in `moveTask`, not just the moved one | §4 |
| 🟠 4 | Narrow the realtime subscription per-table + debounce | §4 fix 3 |
| 🟡 5 | Remove the `readAsDataURL` fallbacks; surface storage failures instead of swallowing them | §3 |
| 🟡 6 | Add `onDragStart`/`onDragEnd` state so the UI can show a "syncing" indicator instead of silently reverting | §4 |
| 🟢 7 | Reset the root ErrorBoundary on route change so a user isn't stuck on the error card | — |

### One more, unrelated but guaranteed to crash

[AppContext.tsx:1296](src/context/AppContext.tsx#L1296) — `resetToDefaultData()` calls `setCurrentUserId(initialUsers[0].id)`, but [initialData.ts:3](src/data/initialData.ts#L3) is `export const initialUsers: User[] = []`. `initialUsers[0]` is `undefined`, so this throws `TypeError: Cannot read properties of undefined (reading 'id')` **every time** someone clicks *Reset Demo Data* in Settings.

It won't white-screen (it's in an event handler, so React survives), but the button silently does nothing. Use `initialUsers[0]?.id ?? authUser?.id ?? ''`.

---

## 9. 📌 Summary

Your white screen was **not** a rendering bug in the board or the task card — it was an unhandled `QuotaExceededError` thrown by `localStorage.setItem` inside `AppProvider`'s persistence effect, in a position where no ErrorBoundary existed to catch it, which makes React tear down the entire root and leave an empty page. The move itself had already been written to storage before the second write failed, which is why a hard refresh showed the correct state. Both of those are now fixed at HEAD. **However**, the new Supabase Realtime subscription in `c6009d4` listens to `event: '*'` across the whole `public` schema with no self-echo filter, so a single drag triggers two full workspace refetches that rebuild the drag-and-drop tree while the drop is still settling — which will break drags again, now as an error card rather than a blank page. Fix that before shipping: ignore your own writes, and never refetch mid-drag.
