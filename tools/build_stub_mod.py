#!/usr/bin/env python3
"""Build the cowpewter_bap stub mod jar.

The pack registers items, advancements and assets under the `cowpewter_bap`
namespace, but no mod owns that id. JEI resolves a namespace to a display name
via ModList -> ModContainer.getModInfo().getDisplayName(), falling back to the
raw namespace, so items showed up under "cowpewter_bap".

This emits a code-free (`lowcodefml`) mod jar whose only job is to claim the id
with a proper display name. It ships no classes, assets or data -- KubeJS still
owns all of those.

mods/ is gitignored, so this script is the tracked source of truth: rerun it
after a clone or a version bump.

Usage:  python3 tools/build_stub_mod.py
"""
import os, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
MODS = os.path.join(HERE, os.pardir, "mods")

MOD_ID = "cowpewter_bap"
VERSION = "0.3.0-beta"
DISPLAY_NAME = "Seed & Stock"
DESCRIPTION = "Names the pack's own content namespace. Adds nothing by itself."

MODS_TOML = f'''modLoader="lowcodefml"
loaderVersion="[1,)"
license="MIT"

[[mods]]
modId="{MOD_ID}"
version="{VERSION}"
displayName="{DISPLAY_NAME}"
authors="cowpewter"
description="""{DESCRIPTION}"""

[[dependencies.{MOD_ID}]]
modId="neoforge"
type="required"
versionRange="[21.0,)"

[[dependencies.{MOD_ID}]]
modId="minecraft"
type="required"
versionRange="[1.21,1.22)"
'''

PACK_MCMETA = '''{
  "pack": {
    "description": "Seed & Stock namespace owner",
    "pack_format": 15
  }
}
'''

# Fixed timestamp so rebuilds are byte-identical (the .mrpack is hashed).
DATE = (1980, 1, 1, 0, 0, 0)


def main():
    out = os.path.normpath(os.path.join(MODS, f"{MOD_ID}.jar"))
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for name, text in (
            ("META-INF/neoforge.mods.toml", MODS_TOML),
            ("pack.mcmeta", PACK_MCMETA),
        ):
            info = zipfile.ZipInfo(name, DATE)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, text)
    print(f"wrote {out} ({os.path.getsize(out)} bytes)")


if __name__ == "__main__":
    main()
