#!/usr/bin/env python3
"""Extract Farmer's Delight recipe JSONs from the installed jar.

Copies data/farmersdelight/recipe/** out of mods/FarmersDelight-*.jar into
tools/fd_recipes/, keeping the jar's subfolders (cooking/, cutting/, ...).
The folder is wiped first so recipes removed by an FD update don't linger.

tools/fd_recipes/ is gitignored: the jar is the source of truth.
regenerate_prices.py runs this itself, so it's only needed by hand when
something else wants the recipes.

Usage:  python3 tools/extract_fd_recipes.py
"""
import glob, os, shutil, sys, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
MODS = os.path.join(HERE, "..", "mods")
OUT = os.path.join(HERE, "fd_recipes")
PREFIX = "data/farmersdelight/recipe/"


def find_jar():
    jars = glob.glob(os.path.join(MODS, "FarmersDelight-*.jar"))
    if len(jars) != 1:
        sys.exit(f"expected exactly one FarmersDelight-*.jar in mods/, found "
                 f"{len(jars)}: {[os.path.basename(j) for j in jars]}")
    return jars[0]


def extract(quiet=False):
    jar = find_jar()
    shutil.rmtree(OUT, ignore_errors=True)
    n = 0
    with zipfile.ZipFile(jar) as z:
        for entry in z.namelist():
            if not entry.startswith(PREFIX) or not entry.endswith(".json"):
                continue
            dest = os.path.join(OUT, entry[len(PREFIX):])
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with z.open(entry) as src, open(dest, "wb") as dst:
                shutil.copyfileobj(src, dst)
            n += 1
    if n == 0:
        sys.exit(f"no {PREFIX}*.json in {os.path.basename(jar)}; did FD move its data?")
    if not quiet:
        print(f"extracted {n} recipes from {os.path.basename(jar)} -> tools/fd_recipes/")
    return n


if __name__ == "__main__":
    extract()
