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
    "icon.png",
]

# Exceptions inside ALLOW. Each is private or per-install.
DENY = [
    "config/resourceful-config-web.json",  # generated web-editor password
    "kubejs/config/web_server.json",       # KubeJS web server auth token
    "config/sounds/chat.json",             # mention keyword = dev's username
    "config/jei/world/*",                  # per-world JEI lookup history
    "*_backup[0-9]*",                      # mod-written config backups
]

# Only these shader packs may be referenced (license: see docs §5b).
ALLOWED_SHADERS = {"shaderpacks/ComplementaryReimagined_r5.9.1.zip"}


def matches(path, patterns):
    return any(fnmatch.fnmatchcase(path, p) for p in patterns)


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
                if rel.endswith(".jar"):
                    problems.append(f"jar in overrides: {rel}")
                zout.writestr(info, zin.read(name))
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
