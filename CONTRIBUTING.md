# Contributing to AFL

Try the [demo](docs/index.html) or follow the [installation guide](README.md). To report a bug, open an issue in the project repository. Include your browser and version, whether you were on a desktop or mobile site, the toggle you used, what you expected, and what you saw. A public example URL with its query and fragment removed may help. Check that screenshots omit account names, recommendations, and anything else you want to keep private.

For changes, keep site permissions as narrow as possible. Add a fixture if a layout change could hide something users need. Prefer selectors that identify a distinct site feature and leave unfamiliar elements visible. Keep the link cleaner conservative so unknown parameters and URLs still work.

Run `node --test tests/*.test.cjs` with Node.js 18 or later. Follow the relevant steps in the [manual test plan](MANUAL-TEST.md) and include the results with your pull request. Contributions are made under the project's GPL-3.0-or-later licence. Credit and check the licence of any third-party work before proposing its inclusion.

Send sensitive findings through the [security reporting route](SECURITY.md).
