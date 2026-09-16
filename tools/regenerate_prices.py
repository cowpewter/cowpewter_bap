#!/usr/bin/env python3
"""Generate Farmer's Delight price entries for wd's Selling Bin.

value(item) = (sum of cheapest legal ingredient values / yield) * MULTIPLIER

Cheapest-legal is deliberate: players optimise inputs, so pricing on the
cheapest valid recipe makes MULTIPLIER a floor on profit, not a ceiling.

Writes straight into selling_bin_value.json. A data map file's NAME is its
ID, and only selling_bin_value is registered, so a separate output file would
be silently ignored by the game.

Merge rules:
  - generated items are upserted; existing `processors` on them are kept
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
OUT = os.path.join(HERE, "..", "kubejs", "data", "selling_bin", "data_maps",
                   "item", "selling_bin_value.json")

# Kept out of the bin; removed from the file if present. See balance
# invariants in docs/farm-pack-design.md.
NEVER_PRICE = {
    "farmersdelight:straw",      # grass -> straw is infinite; money loop
    "farmersdelight:canvas",     # made from straw; same loop
    "farmersdelight:tree_bark",  # log-stripping byproduct, not farm produce
}

BASE = {
    # vanilla, mirroring the existing farm economy file
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
    "minecraft:cooked_beef":20,"minecraft:cooked_porkchop":20,"minecraft:cooked_mutton":18,
    "minecraft:cooked_chicken":18,"minecraft:cooked_rabbit":20,"minecraft:cooked_cod":16,
    "minecraft:cooked_salmon":18,
    # FD crops / basics
    "farmersdelight:cabbage":8,"farmersdelight:tomato":8,"farmersdelight:onion":8,
    "farmersdelight:rice_panicle":6,"farmersdelight:rice":6,"farmersdelight:pumpkin_slice":5,
    "farmersdelight:straw":2,"farmersdelight:tree_bark":3,"farmersdelight:milk_bottle":14,
    "farmersdelight:cabbage_leaf":4,"farmersdelight:pie_crust":30,
    "farmersdelight:organic_compost":8,"farmersdelight:rich_soil":4,
}
# cutting-board / smelting derivatives
BASE["farmersdelight:wheat_dough"]      = BASE["minecraft:wheat"]
BASE["farmersdelight:raw_pasta"]        = BASE["farmersdelight:wheat_dough"]
BASE["farmersdelight:minced_beef"]      = BASE["minecraft:beef"]/2
BASE["farmersdelight:beef_patty"]       = BASE["farmersdelight:minced_beef"]*1.2
BASE["farmersdelight:chicken_cuts"]     = BASE["minecraft:chicken"]/2
BASE["farmersdelight:cooked_chicken_cuts"]= BASE["farmersdelight:chicken_cuts"]*1.2
BASE["farmersdelight:bacon"]            = BASE["minecraft:porkchop"]/2
BASE["farmersdelight:cooked_bacon"]     = BASE["farmersdelight:bacon"]*1.2
BASE["farmersdelight:ham"]              = BASE["minecraft:porkchop"]
BASE["farmersdelight:smoked_ham"]       = BASE["farmersdelight:ham"]*1.2
BASE["farmersdelight:mutton_chops"]     = BASE["minecraft:mutton"]/2
BASE["farmersdelight:cooked_mutton_chops"]=BASE["farmersdelight:mutton_chops"]*1.2
BASE["farmersdelight:cod_slice"]        = BASE["minecraft:cod"]/2
BASE["farmersdelight:cooked_cod_slice"] = BASE["farmersdelight:cod_slice"]*1.2
BASE["farmersdelight:salmon_slice"]     = BASE["minecraft:salmon"]/2
BASE["farmersdelight:cooked_salmon_slice"]=BASE["farmersdelight:salmon_slice"]*1.2
BASE["farmersdelight:fried_egg"]        = BASE["minecraft:egg"]*1.2

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

# Not recipe outputs (or protected base values) but still sold.
# Straw and tree bark are deliberately absent — see NEVER_PRICE.
EXTRA = {
  "farmersdelight:cabbage":8,"farmersdelight:tomato":8,"farmersdelight:onion":8,
  "farmersdelight:rice":6,"farmersdelight:rice_panicle":6,
  "farmersdelight:cabbage_leaf":4,"farmersdelight:pumpkin_slice":5,
  "farmersdelight:wheat_dough":8,"farmersdelight:raw_pasta":8,
  "farmersdelight:minced_beef":7,"farmersdelight:beef_patty":8.4,
  "farmersdelight:chicken_cuts":6,"farmersdelight:cooked_chicken_cuts":7.2,
  "farmersdelight:bacon":7,"farmersdelight:cooked_bacon":8.4,
  "farmersdelight:ham":14,"farmersdelight:smoked_ham":16.8,
  "farmersdelight:mutton_chops":6,"farmersdelight:cooked_mutton_chops":7.2,
  "farmersdelight:cod_slice":5,"farmersdelight:cooked_cod_slice":6,
  "farmersdelight:salmon_slice":6,"farmersdelight:cooked_salmon_slice":7.2,
  "farmersdelight:fried_egg":12,"farmersdelight:milk_bottle":14,
  "farmersdelight:pie_crust":30,"farmersdelight:organic_compost":8,
}
generated = dict(EXTRA); generated.update(out)
generated = {k: number(v) for k,v in generated.items()
             if v and v > 0 and k not in NEVER_PRICE}

dry_run = "--dry-run" in sys.argv[1:]
with open(OUT) as fh:
    values = json.load(fh)["values"]

added, changed, removed = [], [], []
for k, v in generated.items():
    if k not in values:
        values[k] = {"base_value": v, "processors": []}
        added.append(k)
    elif values[k].get("base_value") != v:
        changed.append((k, values[k].get("base_value"), v))
        values[k]["base_value"] = v          # processors left as they were
for k in sorted(NEVER_PRICE & set(values)):
    del values[k]
    removed.append(k)

print(f"\nMULTIPLIER = {MULTIPLIER}  (edit at top of this file and re-run to rescale)")
print(f"{len(generated)} generated entries, {len(values)} total in file")
for k in added:            print(f"  + {k} = {values[k]['base_value']}")
for k, old, new in changed: print(f"  ~ {k}: {old} -> {new}")
for k in removed:          print(f"  - {k} (NEVER_PRICE)")
if not (added or changed or removed):
    print("  no changes")

if dry_run:
    print("\n--dry-run: nothing written")
elif added or changed or removed:
    # match the file's existing style: sorted keys, 2-space indent, no newline
    with open(OUT, "w") as fh:
        json.dump({"values": dict(sorted(values.items()))}, fh, indent=2)
    print(f"\nwrote {os.path.normpath(OUT)}")
