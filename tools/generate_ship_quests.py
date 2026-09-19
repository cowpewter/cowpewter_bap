#!/usr/bin/env python3
"""Generate the Completionism "ship one of everything" quests.

Questlog completes quests atomically -- `questlog progress complete <id>`
force-sets every objective -- so one quest per item would be the only way to
track 140 items if objectives had no independent trigger. They do:
`questlog:advancement` ticks when a player is granted an advancement. So each
shippable item gets an invisible advancement, the shipping bin grants it on
sale, and items are grouped into a handful of readable category quests.

Emits three things, all committed:
  kubejs/data/cowpewter_bap/advancement/ship/<ns>/<path>.json  (one per item)
  config/questlog/quests/6_NN_<category>.json                  (one per category)
  kubejs/startup_scripts/generated_ship_advancements.js        (item -> adv id)

Owns `6_*` quest files and the whole advancement/ship tree: both are wiped
before writing, so renamed categories and dropped items leave no ghosts.

Run tools/regenerate_prices.py FIRST -- the shippable list is read back out of
generated_prices.js, so the quests always match what the bin actually accepts.

Usage:  python3 tools/generate_ship_quests.py [--dry-run]
"""
import json, glob, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))

PRICES_JS = os.path.join(ROOT, "kubejs", "startup_scripts", "generated_prices.js")
RECIPES = os.path.join(HERE, "fd_recipes")
QUEST_DIR = os.path.join(ROOT, "config", "questlog", "quests")
ADV_DIR = os.path.join(ROOT, "kubejs", "data", "cowpewter_bap", "advancement", "ship")
LOOKUP_JS = os.path.join(ROOT, "kubejs", "startup_scripts",
                         "generated_ship_advancements.js")

NAMESPACE = "cowpewter_bap"
CHAPTER = "questlog:completionism"
QUEST_PREFIX = "6"          # matches the completionism chapter's `order`

# Categories in chapter order. `auto` entries are filled from recipe data;
# everything else is listed explicitly. Moving an item is a one-line edit.
CATEGORIES = [
    ("vanilla_crops", "Vanilla Crops", "minecraft:wheat", [
        "minecraft:wheat", "minecraft:potato", "minecraft:carrot",
        "minecraft:beetroot", "minecraft:pumpkin", "minecraft:melon_slice",
        "minecraft:sweet_berries", "minecraft:glow_berries",
        "minecraft:cocoa_beans", "minecraft:apple", "minecraft:sugar_cane",
        "minecraft:brown_mushroom", "minecraft:red_mushroom",
        "minecraft:torchflower", "minecraft:pitcher_plant",
        "animalhusbandry:truffle",
    ]),
    ("animal_products", "Animal Products", "minecraft:egg", [
        "minecraft:egg", "minecraft:milk_bucket", "minecraft:leather",
        "minecraft:feather", "minecraft:honeycomb", "minecraft:honey_bottle",
        "minecraft:rabbit_hide", "minecraft:rabbit_foot",
    ]),
    ("wool", "Wool", "minecraft:white_wool", "auto:wool"),
    ("raw_meat", "Raw Meat & Fish", "minecraft:beef", [
        "minecraft:beef", "minecraft:porkchop", "minecraft:mutton",
        "minecraft:chicken", "minecraft:rabbit",
    ]),
    ("cooked_meat", "Cooked Meat & Fish", "minecraft:cooked_beef", [
        "minecraft:cooked_beef", "minecraft:cooked_porkchop",
        "minecraft:cooked_mutton", "minecraft:cooked_chicken",
        "minecraft:cooked_rabbit",
    ]),
    ("vanilla_kitchen", "Vanilla Recipes", "minecraft:bread", [
        "minecraft:bread", "minecraft:cake", "minecraft:cookie",
        "minecraft:pumpkin_pie", "minecraft:golden_carrot", "minecraft:sugar",
        "minecraft:hay_block",
    ]),
    ("fd_farm", "Farmer's Delight Crops", "farmersdelight:cabbage", [
        "farmersdelight:cabbage", "farmersdelight:rice_panicle",
        "farmersdelight:milk_bottle", "farmersdelight:organic_compost",
        "farmersdelight:pie_crust", "farmersdelight:wheat_dough",
    ]),
    ("cutting_board", "The Cutting Board", "farmersdelight:cutting_board",
     "auto:cutting"),
    ("fd_butchery", "Smoked & Grilled", "farmersdelight:ham", [
        "farmersdelight:beef_patty", "farmersdelight:cooked_bacon",
        "farmersdelight:ham", "farmersdelight:smoked_ham",
        "farmersdelight:fried_egg", "farmersdelight:roasted_mutton_chops",
        "farmersdelight:grilled_salmon",
    ]),
    ("cooking_pot", "The Cooking Pot", "farmersdelight:cooking_pot",
     "auto:cooking"),
    ("fd_meals", "Farmer's Delight Meals", "farmersdelight:hamburger", [
        "farmersdelight:apple_pie", "farmersdelight:bacon_and_eggs",
        "farmersdelight:bacon_sandwich", "farmersdelight:barbecue_stick",
        "farmersdelight:chicken_sandwich", "farmersdelight:chocolate_pie",
        "farmersdelight:cod_roll", "farmersdelight:egg_sandwich",
        "farmersdelight:fruit_salad", "farmersdelight:gleaming_salad_block",
        "farmersdelight:hamburger", "farmersdelight:honey_cookie",
        "farmersdelight:honey_glazed_ham_block", "farmersdelight:kelp_roll",
        "farmersdelight:melon_popsicle", "farmersdelight:mixed_salad",
        "farmersdelight:mutton_wrap", "farmersdelight:nether_salad",
        "farmersdelight:rice_roll_medley_block",
        "farmersdelight:roast_chicken_block", "farmersdelight:salmon_roll",
        "farmersdelight:shepherds_pie_block",
        "farmersdelight:steak_and_potatoes", "farmersdelight:stuffed_potato",
        "farmersdelight:sweet_berry_cheesecake",
        "farmersdelight:sweet_berry_cookie",
    ]),
]

# Title-casing the item path is right for nearly everything; these aren't.
DISPLAY_OVERRIDES = {
    "farmersdelight:gleaming_salad_block": "Gleaming Salad",
    "farmersdelight:honey_glazed_ham_block": "Honey Glazed Ham",
    "farmersdelight:rice_roll_medley_block": "Rice Roll Medley",
    "farmersdelight:roast_chicken_block": "Roast Chicken",
    "farmersdelight:shepherds_pie_block": "Shepherd's Pie",
    "farmersdelight:stuffed_pumpkin_block": "Stuffed Pumpkin",
    "minecraft:hay_block": "Hay Bale",
}


def die(msg):
    sys.exit("ERROR: " + msg)


def shippable():
    """Item ids the bin accepts, read back out of the generated price table."""
    if not os.path.exists(PRICES_JS):
        die(f"{PRICES_JS} missing; run tools/regenerate_prices.py first")
    src = open(PRICES_JS).read()
    ids = re.findall(r"^\s+'([^']+)':", src, re.M)
    if not ids:
        die(f"no item ids found in {PRICES_JS}; did its format change?")
    return ids


def recipe_results(sub):
    """Every item id appearing anywhere in a subfolder's recipe results."""
    out = set()

    def walk(node):
        if isinstance(node, dict):
            for key in ("id", "item"):
                if isinstance(node.get(key), str):
                    out.add(node[key])
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    files = glob.glob(os.path.join(RECIPES, sub, "*.json"))
    if not files:
        die(f"no recipes under {os.path.join(RECIPES, sub)}; "
            "run tools/extract_fd_recipes.py first")
    for f in files:
        walk(json.load(open(f)).get("result"))
    return out


def resolve(items):
    """Bucket every item, or report the ones no rule places."""
    # Cooking-pot output is always a prepared dish, whatever its namespace, so
    # vanilla soups land here too. Cutting output is NOT namespace-safe: raw
    # carrots and mushrooms are cutting results, so that rule is FD-only.
    cooking = recipe_results("cooking")
    cutting = recipe_results("cutting")

    explicit = {}
    for key, _, _, members in CATEGORIES:
        if isinstance(members, list):
            for item in members:
                if item in explicit:
                    die(f"{item} is listed in both {explicit[item]} and {key}")
                explicit[item] = key

    buckets = {key: [] for key, _, _, _ in CATEGORIES}
    unplaced = []
    for item in items:
        ns, path = item.split(":", 1)
        if item in explicit:
            buckets[explicit[item]].append(item)
        elif path.endswith("_wool"):
            buckets["wool"].append(item)
        elif item in cooking:
            buckets["cooking_pot"].append(item)
        elif ns == "farmersdelight" and item in cutting:
            buckets["cutting_board"].append(item)
        else:
            unplaced.append(item)

    if unplaced:
        print(f"{len(unplaced)} item(s) belong to no category:", file=sys.stderr)
        for item in sorted(unplaced):
            print(f"  {item}", file=sys.stderr)
        die("add them to CATEGORIES (nothing was written)")

    stale = [i for i in explicit if i not in items]
    if stale:
        print(f"note: {len(stale)} listed item(s) are no longer shippable "
              "and were skipped:", file=sys.stderr)
        for item in sorted(stale):
            print(f"  {item}", file=sys.stderr)

    return buckets


def display_name(item):
    if item in DISPLAY_OVERRIDES:
        return DISPLAY_OVERRIDES[item]
    return item.split(":", 1)[1].replace("_", " ").title()


def advancement_id(item):
    ns, path = item.split(":", 1)
    return f"{NAMESPACE}:ship/{ns}/{path}"


def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        json.dump(data, fh, indent=2)
        fh.write("\n")


def main():
    dry_run = "--dry-run" in sys.argv
    items = shippable()
    buckets = resolve(items)

    empty = [k for k, v in buckets.items() if not v]
    if empty:
        die(f"categories with no items: {', '.join(empty)} (nothing written)")

    print(f"{len(items)} shippable items across {len(buckets)} categories:")
    for key, title, _, _ in CATEGORIES:
        print(f"  {title}: {len(buckets[key])}")

    if dry_run:
        print("\n--dry-run: nothing written")
        return

    # Own and replace: stale categories and dropped items leave no ghosts.
    for old in glob.glob(os.path.join(QUEST_DIR, f"{QUEST_PREFIX}_*.json")):
        os.remove(old)
    shutil.rmtree(ADV_DIR, ignore_errors=True)

    lookup = {}
    for item in items:
        adv = advancement_id(item)
        lookup[item] = adv
        ns, path = item.split(":", 1)
        # No display block: never toasts, never shows in the advancement screen.
        # impossible means only `advancement grant` can award it.
        write_json(os.path.join(ADV_DIR, ns, f"{path}.json"),
                   {"criteria": {"never": {"trigger": "minecraft:impossible"}}})

    for index, (key, title, icon, _) in enumerate(CATEGORIES, start=1):
        members = sorted(buckets[key], key=display_name)
        write_json(
            os.path.join(QUEST_DIR,
                         f"{QUEST_PREFIX}_{index:02d}_{key}.json"),
            {
                "title": title,
                "description": f"Ship one of every item in this group.\n\n"
                               f"{len(members)} in total.",
                "icon": {"item": icon},
                "sort_order": index,
                "requirements": [],
                "objectives": [
                    {
                        "type": "questlog:advancement",
                        "advancement": advancement_id(item),
                        "name": display_name(item),
                    }
                    for item in members
                ],
                # XP is thin in this pack; scale the payout with the shopping list
                "rewards": [{"type": "questlog:experience",
                             "experience": 5 * len(members)}],
                "chapter": CHAPTER,
            })

    with open(LOOKUP_JS, "w") as fh:
        fh.write("// GENERATED by tools/generate_ship_quests.py -- do not edit\n")
        fh.write(f"// {len(lookup)} items; shipping one grants its advancement,\n")
        fh.write("// which ticks a single objective in the Completionism chapter.\n\n")
        fh.write("global.BAP_SHIP_ADVANCEMENTS = {\n")
        for item in sorted(lookup):
            fh.write(f"  '{item}': '{lookup[item]}',\n")
        fh.write("};\n")

    print(f"\nwrote {len(items)} advancements under "
          f"{os.path.relpath(ADV_DIR, ROOT)}")
    print(f"wrote {len(CATEGORIES)} quests to "
          f"{os.path.relpath(QUEST_DIR, ROOT)}/{QUEST_PREFIX}_*.json")
    print(f"wrote {os.path.relpath(LOOKUP_JS, ROOT)}")


if __name__ == "__main__":
    main()
