# Mobile release guide (Expo/EAS)

This is the release gate for the later mobile phase. Do not submit a production
build until the database/auth migration used by web is also implemented and
tested in `mobile/lib/storageAdapter.ts` and `mobile/lib/syncService.ts`.

## Current blockers found in the repository

- `mobile/app.json` uses `ios.supportsTabletMode`; Expo expects `supportsTablet`.
- The configured EAS `projectId` must be the UUID produced by `eas init`, not a
  Supabase project reference.
- Placeholder App Store Connect values remain in `mobile/eas.json`.
- The production API URL and Supabase values must come from EAS environments,
  not committed production secrets or development fallbacks.
- Confirm whether iOS production distribution is App Store distribution; the
  current `enterpriseProvisioning` setting is not appropriate for a normal
  public App Store release.

## Required accounts and identifiers

- Expo account and EAS project
- Google Play Console app for `com.selfone.mobile`
- Apple Developer and App Store Connect app for `com.selfone.mobile`
- Android service account JSON with Play Console release permission
- Privacy-policy URL, support URL, screenshots, store descriptions, and data
  safety/privacy answers

Package and bundle identifiers cannot be casually changed after publishing.

## Configure environments

From `mobile/`:

```bash
pnpm dlx eas-cli login
pnpm dlx eas-cli init
pnpm dlx eas-cli env:create --environment preview --name EXPO_PUBLIC_API_URL --value https://staging-api.example.com/api/v1
pnpm dlx eas-cli env:create --environment production --name EXPO_PUBLIC_API_URL --value https://api.example.com/api/v1
pnpm dlx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://PROJECT.supabase.co
pnpm dlx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value YOUR_PUBLISHABLE_KEY
```

Never place a Supabase service-role key, PostgreSQL URL, JWT signing secret, or
payment server key in an Expo public variable.

## Test sequence

```bash
pnpm install --frozen-lockfile
pnpm --filter @superapp/mobile preflight
pnpm --filter @superapp/mobile test
pnpm --filter @superapp/mobile exec tsc --noEmit
```

Then build internal artifacts:

```bash
cd mobile
pnpm dlx eas-cli build --platform android --profile preview
pnpm dlx eas-cli build --platform ios --profile preview
```

Test login, fresh install restore, local-cache migration, offline edits, conflict
resolution, notifications, deep links, logout, account deletion, and upgrade from
the last public version. Database migration must be idempotent and retain the
local rollback copy until server verification succeeds.

## Production and submission

```bash
cd mobile
pnpm dlx eas-cli build --platform android --profile production
pnpm dlx eas-cli submit --platform android --profile production
pnpm dlx eas-cli build --platform ios --profile production
pnpm dlx eas-cli submit --platform ios --profile production
```

Release Android to Internal Testing first and iOS to TestFlight first. Promote in
stages only after crash-free sessions, API error rate, migration success rate,
and restore tests are healthy. Use EAS Update only for compatible JavaScript and
asset changes; native dependency, permission, or configuration changes require a
new store binary.
