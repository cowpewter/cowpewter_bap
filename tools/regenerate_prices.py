#!/usr/bin/env python3
"""Generate Farmer's Delight price entries for the shipping bin.

value(item) = (sum of cheapest legal ingredient values / yield) * MULTIPLIER

Cheapest-legal is deliberate: players optimise inputs, so pricing on the
cheapest valid recipe makes MULTIPLIER a floor on profit, not a ceiling.

tools/prices.json is the source of truth: hand-added entries live there
alongside generated ones. Scripts can't read JSON at runtime (KubeJS blocks
java.nio), so the merged table is emitted as a KubeJS script that assigns
global.BAP_PRICES / global.BAP_PRICE_TAGS.

Merge rules:
  - generated items are upserted
  - every other entry in the file (vanilla, animal husbandry, tags) is untouched
  - NEVER_PRICE items are removed and never written (balance invariants)

Usage:  python3 tools/regenerate_prices.py [--dry-run]
"""
import json, glob, os, collections, sys

import extract_fd_recipes

MULTIPLIER = 1.5

HERE = os.path.dirname(os.path.abspath(__file__))
# re-extracted from the FD jar on every run, so an FD update is picked up
RD = extract_fd_recipes.OUT
OUT = os.path.join(HERE, "prices.json")
# generated KubeJS script the shipping bin reads at runtime. Startup, not
# server: `global` is readable everywhere but only assignable in startup
# scripts, and this way client scripts can read prices too.
SCRIPT_OUT = os.path.join(HERE, "..", "kubejs", "startup_scripts",
                          "generated_prices.js")

# Kept out of the bin; removed from the file if present. See balance
# invariants in docs/farm-pack-design.md.
NEVER_PRICE = {
    "farmersdelight:straw",      # grass -> straw is infinite; money loop
    "farmersdelight:canvas",     # made from straw; same loop
    "farmersdelight:tree_bark",  # log-stripping byproduct, not farm produce
    "farmersdelight:rice_panicle", # too unprocessed to sell as produce
    "farmersdelight:organic_compost", # seriously?
    "farmersdelight:rich_soil",  # for planting not selling!
    "animalhusbandry:fried_egg", # dupe of FD recipe
    "farmersdelight:dog_food",   # utility item
    # intermediate ingredients
    "farmersdelight:pie_crust",
    "farmersdelight:tomato_sauce",
    "farmersdelight:wheat_dough",
    "farmersdelight:raw_pasta",
    "farmersdelight:minced_beef",
    "farmersdelight:chicken_cuts",
    "farmersdelight:bacon",
    "farmersdelight:ham",
    "farmersdelight:mutton_chops",
    "farmersdelight:cod_slice",
    "farmersdelight:salmon_slice",
    "minecraft:stick",
    "minecraft:bowl",
    "minecraft:sugar",
}

BASE = {
    # vanilla, mirroring the original farm economy file
    "minecraft:wheat":8,"minecraft:potato":6,"minecraft:carrot":6,"minecraft:beetroot":8,
    "minecraft:melon_slice":3,"minecraft:pumpkin":20,"minecraft:sweet_berries":6,
    "minecraft:glow_berries":14,"minecraft:cocoa_beans":10,"minecraft:apple":12,
    "minecraft:brown_mushroom":8,"minecraft:red_mushroom":8,"minecraft:egg":10,
    "minecraft:milk_bucket":40,"minecraft:sugar":8,"minecraft:beef":14,
    "minecraft:porkchop":14,"minecraft:mutton":12,"minecraft:chicken":12,
    "minecraft:rabbit":14,"minecraft:cod":10,"minecraft:salmon":12,"minecraft:bread":40,
    "minecraft:bone":6,"minecraft:bone_meal":3,"minecraft:rotten_flesh":2,
    "minecraft:dried_kelp":4,"minecraft:ink_sac":6,"minecraft:hanging_roots":3,
    "minecraft:glow_lichen":4,"minecraft:bowl":2,"minecraft:stick":1,
    "minecraft:honey_bottle":35,"minecraft:golden_carrot":160,"minecraft:kelp":2,
    # FD crops / basics
    "farmersdelight:cabbage":8,"farmersdelight:tomato":8,"farmersdelight:onion":8,
    "farmersdelight:rice_panicle":6, "farmersdelight:straw":2,
    "farmersdelight:tree_bark":3,"farmersdelight:milk_bottle":14,
    "farmersdelight:pie_crust":30, "farmersdelight:organic_compost":8,
    "farmersdelight:rich_soil":4,
}

SMELT_MULTIPLIER = 1.2

# cutting-board / smelting derivatives
BASE["minecraft:cooked_beef"]           = BASE["minecraft:beef"]*SMELT_MULTIPLIER
BASE["minecraft:cooked_cod"]            = BASE["minecraft:cod"]*SMELT_MULTIPLIER
BASE["minecraft:cooked_chicken"]        = BASE["minecraft:chicken"]*SMELT_MULTIPLIER
BASE["minecraft:cooked_mutton"]         = BASE["minecraft:mutton"]*SMELT_MULTIPLIER
BASE["minecraft:cooked_porkchop"]       = BASE["minecraft:porkchop"]*SMELT_MULTIPLIER
BASE["minecraft:cooked_rabbit"]         = BASE["minecraft:rabbit"]*SMELT_MULTIPLIER
BASE["minecraft:cooked_salmon"]         = BASE["minecraft:salmon"]*SMELT_MULTIPLIER
BASE["farmersdelight:rice"]             = BASE["farmersdelight:rice_panicle"]
BASE["farmersdelight:pumpkin_slice"]    = BASE["minecraft:pumpkin"]/4
BASE["farmersdelight:cabbage_leaf"]     = BASE["farmersdelight:cabbage"]/2
BASE["farmersdelight:wheat_dough"]      = BASE["minecraft:wheat"]
BASE["farmersdelight:raw_pasta"]        = BASE["farmersdelight:wheat_dough"]
BASE["farmersdelight:minced_beef"]      = BASE["minecraft:beef"]/2
BASE["farmersdelight:beef_patty"]       = BASE["farmersdelight:minced_beef"]*SMELT_MULTIPLIER
BASE["farmersdelight:chicken_cuts"]     = BASE["minecraft:chicken"]/2
BASE["farmersdelight:cooked_chicken_cuts"]= BASE["farmersdelight:chicken_cuts"]*SMELT_MULTIPLIER
BASE["farmersdelight:bacon"]            = BASE["minecraft:porkchop"]/2
BASE["farmersdelight:cooked_bacon"]     = BASE["farmersdelight:bacon"]*SMELT_MULTIPLIER
BASE["farmersdelight:ham"]              = BASE["minecraft:porkchop"]
BASE["farmersdelight:smoked_ham"]       = BASE["farmersdelight:ham"]*SMELT_MULTIPLIER
BASE["farmersdelight:mutton_chops"]     = BASE["minecraft:mutton"]/2
BASE["farmersdelight:cooked_mutton_chops"]=BASE["farmersdelight:mutton_chops"]*SMELT_MULTIPLIER
BASE["farmersdelight:cod_slice"]        = BASE["minecraft:cod"]/2
BASE["farmersdelight:cooked_cod_slice"] = BASE["farmersdelight:cod_slice"]*SMELT_MULTIPLIER
BASE["farmersdelight:salmon_slice"]     = BASE["minecraft:salmon"]/2
BASE["farmersdelight:cooked_salmon_slice"]=BASE["farmersdelight:salmon_slice"]*SMELT_MULTIPLIER
BASE["farmersdelight:fried_egg"]        = BASE["minecraft:egg"]*SMELT_MULTIPLIER

TAG = {
 "c:crops/wheat":"minecraft:wheat","c:crops/potato":"minecraft:potato",
 "c:crops/carrot":"minecraft:carrot","c:crops/beetroot":"minecraft:beetroot",
 "c:crops/cabbage":"farmersdelight:cabbage","c:crops/tomato":"farmersdelight:tomato",
 "c:crops/onion":"farmersdelight:onion","c:crops/rice":"farmersdelight:rice",
 "c:eggs":"minecraft:egg","c:bones":"minecraft:bone",
 "c:drinks/milk":"farmersdelight:milk_bottle","c:foods/bread":"minecraft:bread",
 "c:foods/raw_beef":"minecraft:beef","c:foods/raw_pork":"minecraft:porkchop",
 "c:foods/raw_mutton":"minecraft:mutton","c:foods/raw_chicken":"minecraft:chicken",
 "c:foods/raw_cod":"minecraft:cod","c:foods/raw_meat":"minecraft:mutton",
 "c:foods/safe_raw_fish":"minecraft:cod","c:mushrooms":"minecraft:brown_mushroom",
 "c:foods/berry":"minecraft:sweet_berries","c:foods/leafy_green":"farmersdelight:cabbage_leaf",
 "c:foods/vegetable":"minecraft:potato","c:foods/dough":"farmersdelight:wheat_dough",
 "c:foods/pasta":"farmersdelight:raw_pasta",
 "c:foods/cooked_bacon":"farmersdelight:cooked_bacon",
 "c:foods/cooked_egg":"farmersdelight:fried_egg",
 "c:foods/cooked_meat":"farmersdelight:cooked_mutton_chops",
 "c:foods/cooked_chicken":"farmersdelight:cooked_chicken_cuts",
 "c:foods/cooked_salmon":"farmersdelight:cooked_salmon_slice",
 "c:foods/cooked_beef":"minecraft:cooked_beef",
}

SKIP = ('cabinet','sign','canvas','rope','tatami','_mat','crate','knife','basket',
        'stove','cooking_pot','cutting_board','bale','safety','scaffold','painting',
        'book_from','paper_from','nugget','from_crate','from_bag','packed_mud',
        'lead_from','skillet','horse_feed','_seeds','compost','rich_soil','straw',
        'tree_bark','milk_bucket','_slice_from','pumpkin_from','melon_juice')

def price(ing):
    if isinstance(ing, list):
        return min(price(x) for x in ing)
    if isinstance(ing, dict):
        t = ing.get("type")
        if t == "neoforge:compound": return min(price(c) for c in ing["children"])
        if t == "neoforge:difference": return price(ing["base"])
        if "item" in ing: return BASE.get(ing["item"], 0)
        if "tag" in ing:  return BASE.get(TAG.get(ing["tag"], ""), 0)
    return 0

extract_fd_recipes.extract(quiet=True)

recipes = {}   # result_id -> (total_input_fn, yield)

for f in sorted(glob.glob(os.path.join(RD, "*.json")) + glob.glob(os.path.join(RD,"cooking","*.json"))):
    name = os.path.basename(f)[:-5]
    if any(s in name for s in SKIP): continue
    d = json.load(open(f))
    t = d.get("type","")
    res = d.get("result")
    if not isinstance(res, dict): continue
    rid = res.get("id")
    if not rid: continue
    if any(s in rid for s in SKIP): continue
    cnt = res.get("count",1)

    if t == "farmersdelight:cooking":
        ings = list(d["ingredients"])
        cont = d.get("container")
        cont = cont.get("id") if isinstance(cont, dict) else cont
        recipes.setdefault(rid, []).append((ings, cnt, cont))
    elif t == "minecraft:crafting_shapeless":
        recipes.setdefault(rid, []).append((list(d.get("ingredients",[])), cnt, None))
    elif t == "minecraft:crafting_shaped":
        key = d.get("key",{}); pat = d.get("pattern",[])
        counts = collections.Counter("".join(pat).replace(" ",""))
        ings = []
        for sym, n in counts.items():
            if sym in key: ings += [key[sym]]*n
        recipes.setdefault(rid, []).append((ings, cnt, None))

PROTECTED = set(BASE)          # hand-set values are authoritative
STORAGE = ('_bag','_bale','_crate')   # compression must not earn the multiplier

# iterate to fixpoint (chained recipes: tomato_sauce -> pasta dishes, slices -> pies)
for _ in range(8):
    for rid, variants in recipes.items():
        if rid in PROTECTED or any(x in rid for x in STORAGE): continue
        best = None
        for ings, cnt, cont in variants:
            tot = sum(price(i) for i in ings) + (BASE.get(cont,0) if cont else 0)
            if tot <= 0: continue
            v = tot / cnt * MULTIPLIER
            best = v if best is None else min(best, v)
        if best: BASE[rid] = round(best,1)

out = {rid: BASE[rid] for rid in sorted(recipes) if rid in BASE and BASE[rid] > 0}
print(f"{'item':46} {'value':>7}")
print("-"*55)
for k,v in out.items(): print(f"{k:46} {v:7.1f}")

def number(v):
    return int(v) if float(v).is_integer() else round(float(v),1)

generated = dict({}); generated.update(out)
generated = {k: number(v) for k,v in generated.items()
             if v and v > 0 and k not in NEVER_PRICE}

dry_run = "--dry-run" in sys.argv[1:]
with open(OUT) as fh:
    values = json.load(fh)["values"]

added, changed, removed = [], [], []
for k, v in generated.items():
    if k not in values:
        values[k] = v
        added.append(k)
    elif values[k] != v:
        changed.append((k, values[k], v))
        values[k] = v
for k in sorted(NEVER_PRICE & set(values)):
    del values[k]
    removed.append(k)

print(f"\nMULTIPLIER = {MULTIPLIER}  (edit at top of this file and re-run to rescale)")
print(f"{len(generated)} generated entries, {len(values)} total in file")
for k in added:            print(f"  + {k} = {values[k]}")
for k, old, new in changed: print(f"  ~ {k}: {old} -> {new}")
for k in removed:          print(f"  - {k} (NEVER_PRICE)")
if not (added or changed or removed):
    print("  no changes")


# Tags are expanded to their members on emit, so the game-side lookup is a
# single object read with no ingredient tests. Add members here for any new
# tag priced in prices.json.
DYE_COLORS = ("white", "orange", "magenta", "light_blue", "yellow", "lime",
              "pink", "gray", "light_gray", "cyan", "purple", "blue", "brown",
              "green", "red", "black")
TAG_MEMBERS = {
    "#minecraft:wool": [f"minecraft:{c}_wool" for c in DYE_COLORS],
}


def emit_script(values):
    """Write the merged table as a KubeJS script, tags expanded to members."""
    # coins are whole dollars, so round on the way out; prices.json keeps the
    # fractions so a MULTIPLIER change doesn't compound rounding error
    def coins(v):
        return max(1, int(round(float(v))))

    items = {k: v for k, v in values.items() if not k.startswith("#")}

    expanded = 0
    for tag, v in values.items():
        if not tag.startswith("#"):
            continue
        members = TAG_MEMBERS.get(tag)
        if not members:
            sys.exit(f"no members listed for {tag}; add it to TAG_MEMBERS")
        for m in members:
            # an explicit per-item price always wins over its tag
            if m not in items:
                items[m] = v
                expanded += 1

    items = dict(sorted(items.items()))

    with open(SCRIPT_OUT, "w") as fh:
        fh.write("// GENERATED by tools/regenerate_prices.py -- do not edit\n")
        fh.write(f"// {len(items)} items, MULTIPLIER {MULTIPLIER}\n")
        fh.write("// Values are in dollars; 1 dollar = 1 copper coin.\n\n")
        fh.write("global.BAP_PRICES = {\n")
        for k, v in items.items():
            fh.write(f"  '{k}': {coins(v)},\n")
        fh.write("};\n")
    print(f"wrote {os.path.normpath(SCRIPT_OUT)} "
          f"({len(items)} items, {expanded} from tags)")


if dry_run:
    print("\n--dry-run: nothing written")
else:
    # sorted keys, 2-space indent, to keep diffs readable
    with open(OUT, "w") as fh:
        json.dump({"values": dict(sorted(values.items()))}, fh, indent=2)
        fh.write("\n")
    print(f"\nwrote {os.path.normpath(OUT)}")
    emit_script(values)
