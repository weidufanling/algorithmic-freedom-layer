# Algorithmic Freedom Layer

A Weidu Lab browser extension for hiding selected parts of YouTube and Reddit and cleaning share links. It is free to try and needs no separate account. This is the first beta, version 0.2.0.

Open [the public demo](https://weidufanling.github.io/algorithmic-freedom-layer/) to try the controls on sample pages and clean a real share link without installing the extension.

## What you can do

| Control | What happens |
| --- | --- |
| **Hide Shorts** | Hides recognized Shorts shelves and cards on YouTube Home, Search and watch pages, plus recognized Shorts shortcuts in the main navigation. You can still open a Shorts URL directly. |
| **Hide recommendations** | Hides the recognized video feed on YouTube Home and related suggestions on watch pages. Home mixes recommendations with other material, so this switch can also hide videos from channels you follow when they appear on Home. Your separate Subscriptions page remains available. |
| **Hide trending shelves** | Hides recognized Reddit trending shelves where the site uses a dedicated trending component. |
| **Open Reddit’s New feed** | When the current community listing exposes a link to its New feed, the popup offers to open that feed in a new tab. The popup can also identify when you are already there. If the shortcut is missing, try opening Reddit’s sort menu and then reopen the popup. Reddit serves the feed and applies its normal access rules. [Reddit’s guide to sorting community posts](https://support.reddithelp.com/hc/en-us/articles/360045989712-Why-can-t-I-see-my-post) |
| **Clean link** | Previews a copy of a supported YouTube or Reddit link with known tracking parameters removed. |

All three hide controls start off. They work on supported layouts at `www.youtube.com`, `m.youtube.com` and `www.reddit.com`. Layouts can vary by device, account, region or experiment. The filters leave unfamiliar page elements visible. YouTube and Reddit still select and order the content they send. The popup describes the areas you can hide. For how YouTube describes those areas and the signals it uses across recommendations, see [YouTube’s recommendations guide](https://support.google.com/youtube/answer/16089387).

## Clean a link

Copy a link from the website or another app and paste it into the popup. To fill the field with the current page URL, choose **Use current tab** if your browser provides it. Choose **Clean link**, review the result, then choose **Copy link** or select and copy the result manually. The extension works on this copy of the URL. Normal browsing, the website’s Share button, and the system share sheet keep their usual behaviour.

The cleaner handles recognized direct YouTube video links and Reddit post or comment links. It removes known lowercase campaign keys and YouTube’s `si` share parameter from eligible URLs. Video IDs, timestamps, playlists, other query entries and fragments stay in place. The cleaner preserves links it cannot safely identify, including opaque Reddit `/s/` links, recognized signed or token-bearing links, and links on other sites. [Google’s campaign parameter guide](https://support.google.com/analytics/answer/10917952)

For example, `https://youtu.be/dQw4w9WgXcQ?si=example&t=42#part` becomes `https://youtu.be/dQw4w9WgXcQ?t=42#part`.

## Privacy and permissions

The extension stores the three on/off preferences locally in your browser. It keeps link input and results in the popup while it is open. It sends no telemetry and has no remote service. The browser can give it the current tab URL when you open the popup. It uses this to check for Reddit’s New link on the current community listing and to fill the link field on request. The site filters need access to the supported YouTube and Reddit pages to hide elements there. It uses ordinary paste and only attempts to write the clipboard when you choose **Copy link**. Opening Reddit’s New feed makes a normal browser visit to Reddit.

The extension works on web pages. It does not automate engagement or change your account preferences. Disabling a switch restores the corresponding page elements. To stop all filtering, disable the extension and reload any affected tabs.

## Install a local copy

The beta is an unpacked developer build for desktop browsers. The Chrome Web Store, Firefox Add-ons and Safari App Store have separate review and signing processes. See the [verification record](VERIFICATION.md) for the difference between a supported install route and a browser we tested.

Download and unzip the [beta extension ZIP](https://github.com/weidufanling/algorithmic-freedom-layer/releases/tag/v0.2.0). Select the unzipped folder containing `manifest.json`. If you download the full source instead, select its `extension/` folder.

### Chrome or Brave on desktop

1. Open `chrome://extensions` in Chrome or `brave://extensions` in Brave.
2. Turn on **Developer mode**, choose **Load unpacked**, and select the folder containing `manifest.json`.
3. Open the extension from the browser’s Extensions menu. If a supported page was open during installation, reload it. [Chrome’s local loading guide](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)

### Firefox on desktop

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on** and select `manifest.json` in the unzipped folder.
3. Open the extension from the Extensions menu. Reload any already open supported pages. Firefox removes a temporary add-on on restart. [Mozilla’s temporary installation guide](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/)

### Safari on Mac for a quick test

1. Open **Safari > Settings > Advanced** and enable **Show features for web developers**.
2. In **Settings > Developer**, choose **Add Temporary Extension** if your Safari version offers it. Select the folder containing `manifest.json` and follow Safari’s unsigned-extension prompt.
3. In **Settings > Extensions**, enable the extension if needed. Visit YouTube or Reddit and grant access to the site you want to test. Safari removes a temporary extension at quit or after 24 hours. [Apple’s instructions for temporary and unsigned extensions](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension)

### Package for Mac, iPhone and iPad with Xcode

Use the full Xcode app on a Mac. Open Xcode once to finish setup. For iPhone or iPad simulator testing, install the corresponding iOS simulator runtime in Xcode. Download the full source and run these commands from the unzipped project folder.

```sh
mkdir -p safari-project
xcrun safari-web-extension-packager \
  --project-location "$(pwd)/safari-project" \
  --app-name "Algorithmic Freedom Layer" \
  --bundle-identifier org.example.algorithmicfreedomlayer \
  --swift "$(pwd)/extension"
```

Replace `org.example.algorithmicfreedomlayer` with a unique identifier under your own namespace for signing. Older Xcode releases use `safari-web-extension-converter` in place of `safari-web-extension-packager`. If neither tool is found, check that the full Xcode app is selected under **Xcode > Settings > Locations > Command Line Tools**. The generated project references the original extension files by default. Keep them together and review any manifest warnings before building. [Apple’s packaging guide](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari)

1. **Mac.** Run the macOS app scheme once from Xcode. Then enable the extension in **Safari > Settings > Extensions** and grant the sites you want. If building without a development certificate, follow Apple’s instructions for running unsigned extensions.
2. **iPhone or iPad Simulator.** Select the iOS app scheme, choose an iPhone or iPad simulator, and run it. Apple supports testing unsigned extensions on simulators.
3. **Physical iPhone or iPad.** Apple’s Safari extension guide requires Apple Developer Program membership for device testing. Choose your team under **Signing & Capabilities** for the containing app and extension targets, pair the device, enable Developer Mode if prompted, then run the iOS app scheme on the device.
4. **Enable on iPhone or iPad.** Once the containing app is installed, open **Settings > Apps > Safari > Extensions**, or **Settings > Safari > Extensions** on older systems. Enable the extension for your profile and grant access on the sites you want. Open it from Safari’s page menu. [Apple’s Safari testing guide](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension), [Apple’s Developer Mode guide](https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device), [Apple’s iPhone Safari extension settings guide](https://support.apple.com/guide/iphone/get-extensions-iphab0432bf6/ios)

App Store or TestFlight distribution is a separate signing and submission workflow. The beta download contains the WebExtension files. There is no signed Safari package. On iPhone and iPad the Xcode route applies to sites open in Safari, and the YouTube and Reddit apps are outside its scope. [Apple’s Safari distribution guide](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension)

## Testing and credits

Follow the [manual test plan](MANUAL-TEST.md) and see the [verification record](VERIFICATION.md) for the checks run on this build. With Node.js 18 or later, run `node --test tests/*.test.cjs` from the project folder to check URL handling, page filters and settings.

Read the [privacy notes](PRIVACY.md) and [contribution guide](CONTRIBUTING.md) before reporting a problem. Use the [security policy](SECURITY.md) for a vulnerability.

AFL is licensed under [GPL-3.0-or-later](LICENSE). See [Attribution](ATTRIBUTION.md) for Morphe’s influence.
