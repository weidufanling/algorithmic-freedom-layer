# Manual test plan

Test the unpacked `extension/` folder or the Safari app built from that same folder. Start with all four hide controls off. If another extension already changes YouTube or Reddit, record that in the results and use a separate test environment if available.

Record the build version, browser and OS versions, device, site layout, whether you were signed in, and whether site access was granted. Use **pass**, **fail**, **unavailable**, or **skipped** for each case. If the site did not show a target with the filter off, record **unavailable** for that target. Record only public URLs or synthetic examples and omit account names, private links and screenshots containing personal data.

## Browser and device coverage

Run the core checks in Chrome or Brave on desktop, Firefox on desktop, and Safari on Mac. For mobile Safari, repeat on an iPhone and iPad simulator, then on physical devices when a signed development build is available. Record simulator and device results separately. On iPad, try both the default desktop-style site and the mobile site if it is available. Use the web versions of YouTube and Reddit.

## Popup and local settings

1. Open the popup on a supported site and an unrelated site. Confirm it opens, all hide controls start off on a fresh install, and their checked states and labels are clear.
2. Use Tab and Shift+Tab to move through all controls. Confirm the focus indicator is visible, Space changes a focused checkbox, and Enter or Space activates the focused buttons as expected. Check with a screen reader that labels, checked states, feedback and the link result are announced or reachable. On mobile, repeat using VoiceOver and touch.
3. Use light and dark appearance, a narrow popup and 200% zoom where available. Confirm text, status messages and controls remain readable and reachable.
4. Open two tabs on the same supported site and one on the other supported site. Turn on one switch. Verify that the matching surface updates in both same-site tabs and the other site does not change. Toggle it off and check restoration. Repeat with all four switches and with two switches changed in quick succession.
5. Set different switch states, close and reopen the popup, and reload each page. Verify the saved states persist and are applied. Test persistence after a browser restart where the local installation persists. In Firefox and temporary Safari installations, record any reinstall separately.
6. If the browser supports per-site access controls, deny or withhold access to one supported site, then reload. Confirm the page is unmodified. Grant access to that site, reload, and repeat the relevant filter checks. Check that pasting and cleaning a link still works when access to the current site is denied.
7. In a test profile, upgrade an existing installation with **Hide recommendations** enabled. Verify both new switches start on. Change one of them, reopen the popup, and confirm the switches keep their separate choices. Repeat with the old setting off.
8. In **On this page**, compare the status with what is visible. Check a hidden section, a switch that is off, a recognised page without a matching section, an unfamiliar layout, and a tab the extension cannot check. Confirm that switching a control off restores its section and updates the status. On an unrelated site, check that the popup can still clean a pasted link.

## YouTube and Reddit filters

| Check | Steps and expected result |
| --- | --- |
| YouTube Shorts | With the toggle off, locate an actual Shorts shelf, recognizable card or navigation entry. Turn **Hide Shorts** on and verify the identified items disappear where supported. The regular videos around them and other navigation still work. Switch it off and verify restoration. |
| Direct Shorts access | With **Hide Shorts** on, open a known public Shorts URL directly. Verify it can open and the player remains available. |
| YouTube Home | With both switches off, open Home and identify the normal video feed. Turn **Hide the Home feed** on and verify the recognised feed is hidden. Check that Search and Subscriptions remain reachable and watch-page suggestions remain visible. Turn the switch off and verify the feed returns. |
| YouTube watch page | Start from a public video with related suggestions. Turn **Hide suggestions on watch pages** on and verify recognised suggestions disappear while the Home feed remains visible. Confirm the player, title, description, and comments or live chat where available still work. Repeat with a playlist and confirm playlist controls remain available. Turn the switch off and check restoration. |
| Search and Subscriptions | Turn all YouTube filters on. Verify regular search results, subscriptions, and a channel’s normal videos remain usable. If Shorts cards are present, verify other results beside them remain. |
| Reddit trending | With the toggle off, locate an actual trending shelf. Toggle **Hide trending shelves** and confirm that shelf hides and returns. Normal posts, comments, navigation, search controls and unrelated sidebar content remain available. If testing a search results page, check that its results remain usable. |
| Page navigation | With filters on, use the site’s own links to move between Home, a watch or post page, Search, and a channel or community. Scroll enough to load more items. Try Back and Forward. Confirm supported late-loading content follows the settings and no filter remains stuck on an unrelated page. |
| Variants | Repeat available checks while signed out and in, on a narrow layout, and in another site language where practical. If a layout uses a different shelf, verify surrounding content remains usable and record the unmatched shelf separately. Try an unsupported host, such as Old Reddit, and verify no page filtering. |

## Reddit’s New feed shortcut

1. Open `https://www.reddit.com/r/firefox/` and verify Reddit offers **New** in its sort menu. Open the extension popup. If the shortcut is absent, expand Reddit’s sort menu first and reopen the popup. Select **Open Reddit’s New feed** when available and verify a new tab opens to `https://www.reddit.com/r/firefox/new/`, the original tab stays open, and Reddit identifies the selected sort as **New**. Compare with selecting **New** on Reddit itself. Verify the recent-post ordering as provided by Reddit, taking note of any pinned items separately. Open the popup on the New feed and check that it never offers a duplicate shortcut.
2. Repeat from a different recognized community listing sort. Check that the new tab stays in the same community and the original tab’s sort is preserved.
3. Check Reddit Home, r/all, r/popular, an individual post, a search page, YouTube and an unrelated site. Confirm none offer a community shortcut. Open and close the popup without selecting the shortcut and confirm it opens no tab.
4. Try a community listing that lacks a native **New** link, or withhold extension access to Reddit and reload. Verify the popup leaves the shortcut hidden. If Reddit presents a sign-in or access requirement, verify the extension leaves that requirement and normal navigation intact. Record what the site displayed.

## Link cleaning

Use synthetic parameter values. For each case, enter the URL, choose **Clean link**, check the displayed result, and compare the actual clipboard content after **Copy link** by pasting into a local text editor.

| Input | Expected result |
| --- | --- |
| `https://youtu.be/dQw4w9WgXcQ?si=example&t=42#part` | `https://youtu.be/dQw4w9WgXcQ?t=42#part` |
| `https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLexample&utm_source=share&t=30` | `https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLexample&t=30` |
| `https://www.youtube.com/watch?v=dQw4w9WgXcQ&%75tm_source=keep&pp=a%2fb+c&utm_source=drop&UTM_SOURCE=keep#chapter` | `https://www.youtube.com/watch?v=dQw4w9WgXcQ&%75tm_source=keep&pp=a%2fb+c&UTM_SOURCE=keep#chapter` |
| `https://www.reddit.com/r/firefox/comments/abc123/title/def456/?utm_source=share&context=3#comment` | `https://www.reddit.com/r/firefox/comments/abc123/title/def456/?context=3#comment` |
| `https://www.reddit.com/r/firefox/s/opaque?utm_source=share` | Original URL, including its query. |
| `https://www.youtube.com/watch?v=dQw4w9WgXcQ&token=placeholder&utm_source=share` | Original URL, including its query. |
| `https://www.youtube.com.example/watch?v=dQw4w9WgXcQ&si=example` | Original URL, including its query. |
| `https://example.org/?utm_source=share` | Original URL, including its query. |
| Blank text, ordinary prose, `javascript:alert(1)`, or `https://` | A validation message with no copyable stale result from a previous URL. |

1. With the popup open, change the input after a successful clean. Verify the previous result cannot be copied as if it belongs to the new input. Clean the same result twice and check it remains identical.
2. Use **Use current tab** on a public web page and verify the correct URL appears. Try a browser settings page and verify that pasting still works if the browser withholds its URL.
3. Where the browser denies clipboard writes, confirm the popup gives a way to select and copy the result manually. Check that cleaning on its own leaves the clipboard unchanged.
4. Open a real public video or post using both its original and cleaned URLs and verify the content, timestamp or comment destination match. For a YouTube watch URL with a real playlist parameter, verify the cleaned URL still opens in that playlist.

## Privacy and rollback

1. Disconnect the network after loading the extension and clean a synthetic link. Verify the result still appears. Inspect the popup’s network activity while opening it, changing settings, cleaning and copying. Expect only local extension resources and no requests made by the extension. Loading Reddit through the shortcut is a separate browser navigation.
2. Inspect extension-local storage after saving settings and cleaning a synthetic link. Confirm it contains only the hide preferences. Close and reopen the popup and check the previous link and output are gone.
3. Turn the switches off and compare the supported pages with the original baseline. Disable or remove the extension and reload supported pages. Verify the site’s normal content returns.
