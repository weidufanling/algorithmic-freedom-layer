"""Build a dependency-free unpacked WebExtension ZIP from this source tree."""
import json
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parent
EXTENSION = ROOT / "extension"

def write_package(destination):
    version = json.loads((EXTENSION / "manifest.json").read_text())["version"]
    package = destination / f"afl-{version}-extension.zip"
    destination.mkdir(parents=True, exist_ok=True)
    sources = sorted(EXTENSION.iterdir()) + [ROOT / "LICENSE"]
    with ZipFile(package, "w", compression=ZIP_DEFLATED) as archive:
        for source in sources:
            if source.is_file() and not source.name.startswith("."):
                info = ZipInfo(source.name)
                info.external_attr = 0o100644 << 16
                archive.writestr(info, source.read_bytes(), compress_type=ZIP_DEFLATED)
    print(package)

if __name__ == "__main__":
    write_package(Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "dist")
