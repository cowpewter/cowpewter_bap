#!/usr/bin/env python3
"""Strip personal and local-only files from a Prism-exported .mrpack.

Prism's Modrinth export sweeps up whatever sits in minecraft/: usercache,
command history, minimap waypoints, world backups, mixin dumps, plus the
dev's own options.txt. This rebuilds the pack keeping only an ALLOWLIST of
overrides, swaps in tools/release/options.txt, and drops disabled mods from
the index.

Allowlist, not blocklist: anything a new mod starts writing into minecraft/
is excluded by default and shows up in the report instead of shipping.

Usage:  python3 tools/clean_mrpack.py ~/cowpewter-bap.mrpack [-o OUT]
Writes <name>-clean.mrpack next to the input unless -o is given. The input
is never modified.
"""
import argparse, fnmatch, json, os, sys, zipfile, collections

HERE = os.path.dirname(os.path.abspath(__file__))
RELEASE_OPTIONS = os.path.join(HERE, "release", "options.txt")

# Overrides that ship. Paths are relative to overrides/.
ALLOW = [
    "config/*",
    "kubejs/*",
    # The only jar that may ship in overrides: our own stub mod, which claims
    # the cowpewter_bap namespace so JEI shows "Seed & Stock" instead of the
    # raw id. Built by tools/build_stub_mod.py; not on Modrinth, so it cannot
    # come down through the index like every other mod. Keep this exact-path,
    # never a mods/* glob -- see OWN_JARS below.
    "mods/cowpewter_bap.jar",
    # icon.png deliberately NOT shipped: the pack icon must not be AI-generated,
    # and the old one was. Re-add only once a human-made icon.png is in place.
]

# Exceptions inside ALLOW. Each is private or per-install.
DENY = [
    "config/resourceful-config-web.json",  # generated web-editor password
    "kubejs/config/web_server.json",       # KubeJS web server auth token
    "config/sounds/chat.json",             # mention keyword = dev's username
    "config/jei/world/*",                  # per-world JEI lookup history
    "*_backup[0-9]*",                      # mod-written config backups
    "config/xaeropatreon.txt",             # Xaero supporter key; empty today,
                                           # but ships silently once it isn't
]

# Jars we author ourselves and therefore allow in overrides. Everything else
# with a .jar extension is a packaging mistake (a mod that should be a Modrinth
# index entry) and fails the export.
OWN_JARS = {"mods/cowpewter_bap.jar"}

# Only these shader packs may be referenced (license: see docs §5b).
ALLOWED_SHADERS = {"shaderpacks/ComplementaryReimagined_r5.9.1.zip"}

# Dev-machine settings rewritten to player defaults at export, so the dev
# instance can keep its own. {override path: [(toml section, key, value)]}.
# A patch whose section/key isn't found is reported as a PROBLEM.
TOML_PATCHES = {
    "config/chloride-client.toml": [
        ("fullscreen", "mode", '"WINDOWED"'),   # dev Deck boots fullscreen
        ("fpsDisplay", "mode", '"OFF"'),        # dev FPS overlay
    ],
}


def matches(path, patterns):
    return any(fnmatch.fnmatchcase(path, p) for p in patterns)


def patch_toml(text, section, key, value):
    """Set `key = value` inside [section]. Returns (text, found)."""
    out, current, found = [], None, False
    for line in text.split("\n"):
        s = line.strip()
        if s.startswith("[") and s.endswith("]"):
            current = s[1:-1].strip()
        elif (current == section and not found and "=" in s
              and s.split("=", 1)[0].strip() == key):
            indent = line[:len(line) - len(line.lstrip())]
            line = f"{indent}{key} = {value}"
            found = True
        out.append(line)
    return "\n".join(out), found


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("mrpack")
    ap.add_argument("-o", "--output")
    args = ap.parse_args()

    src = os.path.expanduser(args.mrpack)
    out = args.output or src[:-len(".mrpack")] + "-clean.mrpack"
    if os.path.abspath(out) == os.path.abspath(src):
        sys.exit("output would overwrite the input; pass a different -o")

    with open(RELEASE_OPTIONS, "rb") as fh:
        release_options = fh.read()

    problems = []
    kept, dropped = 0, collections.Counter()

    with zipfile.ZipFile(src) as zin, \
         zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zout:
        # --- index ---
        index = json.loads(zin.read("modrinth.index.json"))
        files = []
        for f in index["files"]:
            p = f["path"]
            if p.endswith(".disabled"):
                print(f"  index: dropped disabled {p}")
                continue
            if p.startswith("shaderpacks/") and p not in ALLOWED_SHADERS:
                print(f"  index: dropped unlicensed shader {p}")
                continue
            if not all(u.startswith("https://cdn.modrinth.com/")
                       for u in f.get("downloads", [])):
                problems.append(f"non-Modrinth download for {p}")
            files.append(f)
        index["files"] = files
        zout.writestr("modrinth.index.json", json.dumps(index, indent=2))

        # --- overrides ---
        for info in zin.infolist():
            name = info.filename
            if name == "modrinth.index.json" or name.endswith("/"):
                continue
            if not name.startswith("overrides/"):
                problems.append(f"unexpected top-level entry {name}")
                continue
            rel = name[len("overrides/"):]
            if rel == "options.txt":
                continue                       # replaced below
            if matches(rel, ALLOW) and not matches(rel, DENY):
                if rel.endswith(".jar") and rel not in OWN_JARS:
                    problems.append(f"jar in overrides: {rel}")
                data = zin.read(name)
                if rel in TOML_PATCHES:
                    text = data.decode("utf-8")
                    for section, key, value in TOML_PATCHES[rel]:
                        text, found = patch_toml(text, section, key, value)
                        if found:
                            print(f"  patched: {rel} [{section}] {key} = {value}")
                        else:
                            problems.append(f"patch target missing: {rel} [{section}] {key}")
                    data = text.encode("utf-8")
                zout.writestr(info, data)
                kept += 1
            else:
                dropped[rel.split("/")[0] if "/" in rel else rel] += 1
                if matches(rel, DENY):
                    print(f"  overrides: denied {rel}")

        zout.writestr("overrides/options.txt", release_options)

    print(f"\nkept {kept} override files + release options.txt; "
          f"{len(files)} index downloads")
    print("dropped overrides:")
    for top, n in sorted(dropped.items()):
        print(f"  {n:4}  {top}")

    shaders = [f["path"] for f in files if f["path"].startswith("shaderpacks/")]
    print(f"shaders referenced: {shaders or 'none'}")

    print(f"\nwrote {out} ({os.path.getsize(out) / 1e6:.1f} MB, "
          f"was {os.path.getsize(src) / 1e6:.1f} MB)")
    if problems:
        print("\nPROBLEMS — check before uploading:")
        for p in problems:
            print(f"  ! {p}")
        sys.exit(1)


if __name__ == "__main__":
    main()
