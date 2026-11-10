# Beta verification

## 0.3.0 test build, 10 November 2026

Live checks used desktop Brave with an isolated, signed-out test profile and the actual toolbar popup.

| Page | Result |
| --- | --- |
| YouTube Home | The page showed a sign-in prompt and an empty feed. The Home switch left the prompt and Search visible, reported no matching section, and left watch-page suggestions alone. A populated live Home feed was unavailable. |
| YouTube watch | The watch switch hid and restored the related videos while the title and player remained visible. The popup reported the hidden and restored states. |
| YouTube search | The Shorts switch hid and restored the Shorts shelves while ordinary results remained visible. The popup reported the hidden and restored states. |
| Reddit | Reddit's network-security page blocked Home, community and search requests. No live Reddit filter result was possible in this session. |

All 29 automated tests passed. Installed Brave smoke tests on sample pages covered a populated Home feed, the desktop and mobile YouTube layouts, navigation between pages, the old setting carried over to the two new switches, and the link cleaner. On the Reddit sample page, the toolbar popup reported the trending shelf hidden and restored, ordinary posts remained visible, and the New feed shortcut was still offered.

Signed-in layouts, Firefox and installed Safari were outside these checks. The public [0.2.0 release](https://github.com/weidufanling/algorithmic-freedom-layer/releases/tag/v0.2.0) and [demo](https://weidufanling.github.io/algorithmic-freedom-layer/) remained available.

## 0.2.0 public beta

Version 0.2.0, 9 November 2026.

- All 18 Node tests passed. The tests cover the link cleaner, Reddit community links, page filter state, and a settings change that arrives while the popup is loading.
- The exact unpacked extension loaded in Brave (Chromium 157) with an isolated test profile. Its popup, storage, page injection, toggle reversibility, YouTube in-page navigation, and URL preview worked on sample pages served at the three supported origins.
- Offscreen WebKit fixture checks covered desktop and mobile YouTube layouts, Reddit trending components, the Reddit New shortcut, popup state and layout, and copy fallback. These tests use sample pages and mocked browser APIs.
- The demo passed at 320px and 1080px in WebKit. It restored sample cards, cleaned links, preserved protected links, blocked a test network request, and loaded only its local files.
- An offscreen WebKit extension host loaded the manifest and popup and updated storage. It did not apply the injected stylesheet in the fixture environment. Installed Safari behaviour remains unverified.
- YouTube and Reddit may deliver different layouts by account, region or device. The [manual test plan](MANUAL-TEST.md) explains what to check on live pages and which elements should remain visible.
- The downloads are unpacked developer builds. Firefox signing, Safari signing and distribution, and store listings are separate steps.
