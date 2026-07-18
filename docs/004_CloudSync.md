# Cloud Sync

Version 2.0.0 uses Supabase while retaining LocalStorage as the immediate, offline-capable store.

## Flow

1. Every edit is written to LocalStorage immediately.
2. Signed-in devices upload a debounced snapshot to Supabase.
3. A new device merges its local data with the existing cloud snapshot on first sign-in.
4. When connectivity returns, pending local changes are retried automatically.
5. Session deletions are tracked as tombstones so another device cannot restore a deleted session.

## Security

- Supabase Auth identifies the user.
- Row Level Security permits access only when `auth.uid()` matches `user_id`.
- The browser contains only the Supabase publishable key.
- Secret and service-role keys must never be included in the application.

## Persistence

- LocalStorage remains the primary immediate write target.
- `shoot_log_snapshots` stores one atomic JSON snapshot per authenticated user.
- Optimistic revisions detect concurrent cloud writes.
- JSON export and merge restore remain available as an independent backup.

## Free project keepalive

The `Keep Supabase active` GitHub Actions workflow reads the public keepalive row three times per day. It does not access user snapshots.
