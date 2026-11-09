# Beta verification

Version 0.2.0, 9 November 2026.

- All 18 Node tests passed. The tests cover the link cleaner, Reddit community links, page filter state, and a settings change that arrives while the popup is loading.
- The exact unpacked extension loaded in Brave (Chromium 157) with an isolated test profile. Its popup, storage, page injection, toggle reversibility, YouTube in-page navigation, and URL preview worked on sample pages served at the three supported origins.
- Offscreen WebKit fixture checks covered desktop and mobile YouTube layouts, Reddit trending components, the Reddit New shortcut, popup state and layout, and copy fallback. These tests use sample pages and mocked browser APIs.
- The demo passed at 320px and 1080px in WebKit. It restored sample cards, cleaned links, preserved protected links, blocked a test network request, and loaded only its local files.
- An offscreen WebKit extension host loaded the manifest and popup and updated storage. It did not apply the injected stylesheet in the fixture environment. Installed Safari behaviour remains unverified.
- YouTube and Reddit may deliver different layouts by account, region or device. The [manual test plan](MANUAL-TEST.md) explains what to check on live pages and which elements should remain visible.
- The downloads are unpacked developer builds. Firefox signing, Safari signing and distribution, and store listings are separate steps.
