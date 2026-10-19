# Mobile startup branding repair

The supplied screenshot shows Expo Go's host loading screen. Expo Go displays `expo.icon`, not the full production splash layout. The old `mobile/assets/icon.png` already contained an off-center rounded tile, white exterior padding, and a crop against its right/bottom edges; Expo Go's own icon container made that crop more obvious.

## Changes

- Repaired the original raster W mark using the built-in imagegen editor, retaining its ribbon shape, green palette, and gold dot.
- Exported a centered opaque RGB app icon with even opposing margins. The background is a flat cream surface, without baked-in rounded corners, a frame, or an external shadow.
- Exported a separate transparent Android adaptive foreground sized inside the safe circle.
- Configured the installed `expo-splash-screen` plugin explicitly: transparent mark, 160dp image width, `contain`, cream background, and a matching dark variant. The legacy splash configuration points at the same artwork for consistency.
- Stacked the in-app loading mark and name vertically, reduced the spinner spacing, and anchored its footer independently so it does not shift the main content off center. Safe-area insets account for the status/navigation bars.

## Saved assets

- `mobile/assets/branding/mark-master.png` — cleaned original mark.
- `mobile/assets/branding/app-icon.png` — 1024×1024 opaque app icon, also used by Expo Go.
- `mobile/assets/branding/adaptive-foreground.png` — 1024×1024 transparent Android foreground.
- `mobile/assets/branding/splash-mark.png` and `splash-mark-dark.png` — transparent 512×512 startup marks.

Recreate platform files with `node scripts/generate-mobile-branding.cjs`. Verify dimensions, opposing margins, opacity, adaptive safe-circle containment, and configuration paths with `node scripts/verify-mobile-branding.cjs`.

## Applying the update

Stop the old Metro process, run `pnpm --dir mobile dev:clear`, then close and reopen the project in Expo Go using the new QR code. Expo Go still controls its white host screen, name, and container sizing. Its host layout cannot be replaced with the production splash using application JavaScript. A new release binary is needed to see the configured native splash exactly; an OTA/Metro reload does not change native splash resources.

References: [Expo splash-screen behavior](https://docs.expo.dev/versions/latest/sdk/splash-screen/), [Expo splash and app-icon guide](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/).

## Verification

- Asset geometry and configuration checks pass.
- Expo configuration resolves to the new app icon and adaptive foreground, with the explicit splash plugin options.
- Mobile TypeScript check and multilingual audit pass.
- Android and iOS JavaScript/Hermes production exports compile. This does not constitute native launch-screen testing on a device or a release APK/IPA.

## Final edit prompt

Built-in imagegen edit, using `mobile/assets/whenya-icon.png` as the reference/target, with transparency enabled:

> Edit this existing Whenya brand mark into a clean high resolution production master, NOT a redesign. Preserve the exact recognizable broad folded ribbon W silhouette, its three ribbon folds, dark forest green left stroke, sage green right stroke, soft cream/sage gradients, and the round gold dot above the right stroke. Remove every stray speckle, jagged cutout edge, checker artifact and background pixel surrounding the mark. Smooth anti-aliased edges, crisp original shape. Output ONLY the complete original W and gold dot on a genuinely transparent square canvas, fully visible and centered with ample equal external margins. No tile, no border, no rounded-square container, no shadows outside the mark, no wordmark, no letters added, no watermarks. The brand shape must match the supplied image rather than inventing a different W.
