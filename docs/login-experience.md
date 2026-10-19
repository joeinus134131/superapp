# Whenya login refresh

The web and mobile login now use a warm cream and forest-green palette, a peaceful original workspace illustration, lighter form borders, consistent spacing, and Google/Apple sign-in above the email fields. Web uses a two-column story/form layout and collapses to a single column on small screens. Mobile uses an illustrated header and a rounded form sheet, with its existing dark-mode support.

English remains the default. New copy is available in Indonesian. Password visibility, registration, guest/local profiles on web, and the existing authentication handlers are retained. The seven existing authentication handlers were compared against the pre-change files and remain unchanged.

Changing the mobile login language previously unmounted the root navigator and could redirect to onboarding. The navigator now remains mounted during language preference updates, preserving the route and form draft. Browser checks confirmed English/Indonesian switching and email draft retention on the login screen.

## Illustration

Generated with the built-in imagegen tool, then encoded as a 259 KB WebP for both clients. No third-party image downloads or extra application dependencies were added.

- Web asset: `web/public/images/login-sanctuary.webp`
- Mobile asset: `mobile/assets/auth/login-sanctuary.webp`
- Original generation remains in the Codex generated-images directory.

Final generation prompt:

> Use case: illustration-story. Asset type: production background illustration for Whenya web and mobile login, landscape 3:2 composition. Create one premium painterly editorial anime-inspired illustration: a peaceful plant-filled home workspace beside a large open window overlooking layered misty green mountains and a sunrise valley. A young adult seen from behind in a sage green sweater quietly sitting at a wooden desk, positioned in the lower right third, coffee cup, notebook, closed laptop, warm sunlight through leaves. Soft atmospheric brushwork, refined natural textures, muted forest greens, sage, warm cream and restrained honey gold. Calm, fresh, spacious, restorative mood for busy urban lives. Upper left two thirds mostly luminous cream sky and very subtle mountains, deliberately uncluttered for dark green overlaid brand and headline. Foreground leaves frame edges, detailed desk at bottom, no busy details behind text area. This is artwork only, not a website mockup: absolutely no text, letters, logos, UI, borders, screens or watermarks. Inspired by the user's peaceful illustrated login reference; create an original scene.

## Verification

- Production web build and mobile TypeScript check pass.
- Static multilingual audit passes, including new login copy.
- Shared tests: 143 passing. Mobile tests: 7 passing.
- Web lint: no errors; existing BrandLogo image optimization warnings remain.
- Expo Android and iOS production JavaScript/Hermes bundles compile.
- Visual review uses the production web app and the mobile implementation through Expo web in a 390px iframe, rather than a separate HTML approximation.
- Web registration and guest modes are inspected without creating accounts or submitting authentication requests.

Signed native builds, real-device keyboard behavior, and live Google/Apple authentication were not tested. The Expo web preview reports an existing security-settings storage warning; this is separate from the login layout and is not hidden or changed in application code.

## Android header sizing repair

The header image now lives in an unpadded, stretched frame; horizontal and safe-area padding apply only to its content. The image fills that frame with `cover`, avoiding percentage image sizing against a padded ImageBackground on native Android. Header height is content-driven with a minimum height, so translated headlines and larger system text remain inside the illustration above the rounded sheet. Authentication handlers and translations are unchanged. Expo web preview is a visual check, not physical Android-device verification.

## Registration refresh

Registration on web and mobile follows the same illustration, cream/forest palette, OAuth stack above email fields, quiet borders, and primary action as login. Mobile shares auth styles and the Google mark with login; both keep the unpadded image frame and content-driven header. Name/email/password fields, registration/OAuth handlers, success messaging and return-to-login navigation remain. Mobile also exposes language selection and connection retry, with safe-area and dark-mode styling. English remains the default and Indonesian copy is available. Verification: mobile TypeScript, multilingual audit, production web build, and Android JavaScript/Hermes export; browser visual review without submitting accounts. Native-device registration and live OAuth are not verified.
