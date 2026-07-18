# Cloud Sync

Version 2.7.3 uses Supabase while retaining LocalStorage as the immediate, offline-capable store. Account settings include password-manager integration, authenticated password changes, email password recovery, Japanese password error messages, browser-specific PWA installation guidance, public legal documents with required signup consent, a public support page, and automatic Supabase health checks at launch, foreground resume, and six-hour intervals while running. Cloud-sync guidance is device-neutral for supported computers and smartphones. Purple foreground text uses a lighter dark-mode accent to maintain readable contrast against the night background. App background, text, and native form controls share one color-scheme decision to prevent dark backgrounds with light-mode text on iOS PWAs. The latest health result is stored locally and displayed in account settings; GitHub Actions continues external keepalive checks while the PWA is closed. Signed-out users are locked to account and public support or legal screens so device-local data is not exposed. PWA updates use only the active version cache.

## Flow

1. Every edit is written to LocalStorage immediately.
2. Signed-in devices upload a debounced snapshot to Supabase.
3. A new device merges its local data with the existing cloud snapshot on first sign-in.
4. When connectivity returns, pending local changes are retried automatically.
5. Session deletions are tracked as tombstones so another device cannot restore a deleted session.
6. When a different account signs in on the same device, only that account's cloud snapshot is loaded; data from the previous account is never merged into it.

## Security

- Supabase Auth identifies the user.
- Row Level Security permits access only when `auth.uid()` matches `user_id`.
- The browser contains only the Supabase publishable key.
- Secret and service-role keys must never be included in the application.
- Confirmation emails explicitly return to the deployed application URL.
- `delete_shoot_log_account()` accepts no user ID and can delete only the authenticated caller.

## Account deletion

- Account deletion permanently removes the authenticated Supabase Auth user.
- The snapshot row is removed by its `on delete cascade` foreign key.
- LocalStorage data remains on the device until it is replaced by another account or explicitly cleared.

## Persistence

- LocalStorage remains the primary immediate write target.
- `shoot_log_snapshots` stores one atomic JSON snapshot per authenticated user.
- Optimistic revisions detect concurrent cloud writes.
- JSON export and merge restore remain available as an independent backup.

## Free project keepalive

The `Keep Supabase active` GitHub Actions workflow reads the public keepalive row three times per day. It does not access user snapshots.
