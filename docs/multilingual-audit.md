# Multilingual audit — 18 October 2026

Scope: English and Indonesian across the Next.js web client, Expo mobile client, shared copy, and the AI journal/insights endpoints. Changes are limited to language behavior, UI copy, accessibility labels, formatting, native localization metadata, and regression checks. No stylesheets, screen ordering, or visual components were redesigned.

## Changes

- English is the first-launch default on both platforms. An explicitly saved English or Indonesian preference still takes precedence. Mobile no longer changes the initial app language to match the device.
- Web document language follows the selected language. Public privacy and terms pages now receive the same language provider.
- Previously literal copy is translated across navigation, dashboard, authentication, onboarding, tasks, habits, goals, finance and its repository/research/review screens, health, journal, reading, calendar, insights, achievements, premium, settings, quick capture, notifications, and dialogs.
- Added the missing gamification level keys. Translation lookup falls back to English safely, including nested values.
- Dates and currency presentation follow the selected language. Financial currency remains IDR in either language, including masked balances and CSV categories.
- Built-in reminder templates, focus notifications, activity messages, accessibility labels, quests, and level narratives have localized copy. User-entered task/journal text and custom reminder content remain unchanged.
- Mobile AI requests send the selected language. The backend defaults to English and supports Indonesian for new journal analysis, journal prompts, and AI insights. AI insight caches are separated by language.
- iOS permission descriptions have English defaults and matching Indonesian localization files. Native system dialogs use the operating system's language selection.

## Validation

- `pnpm audit:i18n`: passed. Scanned 156 source files, 867 dictionary-key references and 1,156 literal catalog references. Verified English/Indonesian key and placeholder parity, built-in dynamic key declarations, and untranslated JSX text/accessibility attributes, with explicit exemptions for brands, technical identifiers, and units.
- `pnpm --filter @superapp/web build`: passed production compilation, type checking, and page generation.
- `pnpm --filter @superapp/web lint`: no errors; three existing `<img>` optimization warnings in BrandLogo remain outside this language-only change.
- `pnpm --dir mobile exec tsc --noEmit`: passed.
- `pnpm --filter @superapp/shared test -- --runInBand`: 143 tests passed, including multilingual regression tests.
- `pnpm --filter @superapp/mobile test -- --runInBand`: 7 tests passed.
- Backend HTTP package tests passed, including requested-language selection and journal prompt fallbacks.
- Expo production JavaScript/Hermes exports passed for Android and iOS.
- Expo locale resolution verified all six iOS permission-description keys in both languages.
- Browser smoke check verified English dashboard/settings copy, English → Indonesian → reload persistence → English, localized dates, and unchanged user-authored task text.

## Verification limits

The static audit cannot prove every runtime branch or remote response. Signed APK/IPA installation, real-device permission dialogs, and live AI-provider output were not exercised. Previously saved user content and personalized AI responses retain their original language. These checks establish the tested multilingual behavior, not release readiness of unrelated application features.

Run `pnpm audit:i18n` again after changing UI copy or dictionaries.
