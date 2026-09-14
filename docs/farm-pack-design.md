# Seed & Stock: Swords to Ploughshares — Design Document

Minecraft 1.21.1, NeoForge 21.1.250. A pack about breeding farm animals and
building an agricultural economy. No combat.

Made for the **BAP** packjam (3 weeks). "BAP" is the jam, not the pack — it
survives only in internal identifiers (namespace, instance name, repo name).

### Name

**Seed & Stock: Swords to Ploughshares** (short form: **Seed & Stock**).

- *Seed* — crops, and the exploration that finds new seeds.
- *Stock* — livestock, "good stock" bloodlines (genetics, generation quests),
  and trade value (selling bin, trader).
- *Swords to Ploughshares* — no combat, backed by a real design choice: swords
  are removed and the knife took over their one farm job (§4).

Chosen 2026-09-14. Free as a Modrinth modpack title at the time; also checked
against Greener Pastures, Good Stock, Heirloom, Clover & Kin/Fold/Sow.

**Namespace: `cowpewter_bap`.** Custom recipes live in
`kubejs/data/cowpewter_bap/recipe/`. Quests use Questlog's own `questlog:`
namespace (IDs come from filenames), and selling bin data uses `selling_bin:`
because a data map file's name is its registered ID.

---

## Handoff — read this first

### Environment

Steam Deck, Prism Launcher via Flatpak. Instance is **BAP**.

```
~/.var/app/org.prismlauncher.PrismLauncher/data/PrismLauncher/instances/BAP/minecraft/
```

Everything below is relative to that `minecraft/` folder. Logs are at `logs/latest.log`.
Minecraft 1.21.1, NeoForge 21.1.250, ~190 mods. Namespace for custom content is
**`cowpewter_bap`**.

### File manifest

```
docs/
  farm-pack-design.md           this doc

tools/
  regenerate_prices.py          rebuilds Farmer's Delight bin prices (see below)
  fd_recipes/                   bundled FD recipe JSONs it reads
  clean_mrpack.py               strips personal/local files from an export (§5b)
  release/options.txt           options.txt shipped to players (§5b)
  icon/make_icon.py             draws the pack icon (32x32 pixel art) -> icon.svg/png

shaderpacks/
  complementary-reimagined.pw.toml   Modrinth metadata for the shipped shader (§5b)

kubejs/server_scripts/
  gamerules.js                  15 gamerules, applies once per world (see §1)
  wanderer_trades.js            trader stock (needs MoreJS)
  canvas_as_leather.js          canvas -> c:leathers tag + replaceInput
  genetics_quest_bridge.js      reads Animal Husbandry NBT, completes quests
  no_swords.js                  removes sword recipes + loot, knife in tool swapper

kubejs/client_scripts/
  hide_swords.js                hides #minecraft:swords from JEI

kubejs/data/cowpewter_bap/recipe/
  wool_to_string.json           cutting board, shears, 1 wool -> 2 string
  bone_from_bone_meal.json      3 bone meal -> 1 bone
  slime_ball_from_dough.json    wheat dough + lime dye -> slimeball
  green_dye_from_leaves.json    4 leaves -> 1 green dye
  item_frame_from_canvas.json   8 sticks + canvas
  shears_from_copper.json       2 copper ingots
  bucket_from_copper.json       3 copper ingots

kubejs/data/selling_bin/data_maps/item/
  selling_bin_value.json        125 entries (80 Farmer's Delight) — FILENAME IS THE DATA MAP ID
  selling_bin_currencies.json   emerald 100, emerald_block 900 — KEEP BOTH

kubejs/data/minecraft/worldgen/structure_set/
  villages.json                 empty structures array
  pillager_outposts.json        empty structures array
  woodland_mansions.json        empty structures array

config/questlog/quests/         24 quest JSONs
config/questlog/chapters/       5 chapter JSONs (main, farm, market, kitchen, storage)
config/biomespawnpoint/spawnbiomes.txt    7 allowed biomes (see §5); `!` prefix = excluded
config/incontrol/spawn.json               one rule: {"hostile": true, "result": "deny"}
config/waystones-common.toml              chunksBetweenWildWaystones = 20, transportLeashed = ENABLED
```

The other `config/incontrol/*.json` files exist but are empty arrays.

`~/Documents/BAP/cowpewter-bap-files.zip` is an older bundle of all of the
above. Everything in it now lives in the repo; the copies in the zip are stale.

### Version control

Git repo at `minecraft/` (branch `main`), pushed to
`git@github.com:cowpewter/cowpewter_bap.git`. The Deck authenticates with
`~/.ssh/id_ed25519` (no passphrase). `.gitignore` ignores
everything except `docs/`, `tools/`, `kubejs/`, `config/` and the shipped shader's `.pw.toml`. Also excluded:
`config/resourceful-config-web.json` (holds a generated web-editor password),
`kubejs/config/web_server.json` (KubeJS web server auth token — was committed
before 2026-09-14, so it's in history), `config/jei/world/` (per-world lookup
history) and mod-written `*_backup1`-style files. Not tracked: mods, saves, logs.

After a change is verified in game: `git add -A && git commit -m "..." && git push`.
Mods rewrite their own configs, so `git diff config/` after a launch can show
changes you didn't make — check before committing.

### Verifying a change

`/reload` applies KubeJS and datapacks. `/ql reload` applies quests. Then grep
`logs/latest.log`:

| What | Expected |
|---|---|
| `Errors in registry` | **zero hits** — any hit blocks world creation |
| `DataMapLoader` | nothing mentioning `selling_bin` |
| `KubeJS Server` ... `Loaded` | `5/5 ... with 0 errors` |
| `[cowpewter_bap]` | one line per script that ran |
| `Loaded N quests and M chapters` | **24 quests and 5 chapters** |

Known-harmless errors that appear every launch and are not worth chasing:
`pride` and `wdutils` missing access transformers, `twilightforest:giant_leaves`
(Better Leaves reaching for a mod that isn't installed), `cape is not a
registered slot type` (Curios), `modid:example` in a dimension data map.

### Regenerating Farmer's Delight prices

From `minecraft/`:

```bash
python3 tools/regenerate_prices.py --dry-run   # show what would change
python3 tools/regenerate_prices.py             # write it
```

Change `MULTIPLIER` at the top of the script to rescale. Recipes are bundled in
`tools/fd_recipes/`. The script writes **directly into
`selling_bin_value.json`**: generated items are updated in place (their
`processors` kept), every other entry is left alone, and anything in
`NEVER_PRICE` (straw, canvas, tree bark) is removed. It prints each add, change
and removal, and doesn't touch the file when nothing changed. Review with
`git diff` before committing.

Older versions wrote a separate `selling_bin_value_farmersdelight.json` that had
to be merged by hand — the game ignores that filename (see "Things that bit
us"). Fixed 2026-09-14.

### State

Everything below is built and verified in game except where the Open Questions
section says otherwise. The pack has not had a real playtest — remaining
unknowns are mostly about feel and pacing, not function.

**Doc audit 2026-09-14** — checked against the actual files. Fixed:
- `gamerules.js` had `doTraderSpawning: false`, which would have killed the only
  livestock source on any fresh world. The test world escaped because its rules
  were applied before that line existed. Now `true`.
- Wolf trade was documented but missing from `wanderer_trades.js`. Added (20–28).
- `zz_recipe_probe.js` debug script deleted (it made KubeJS report 5/5).
- Stale counts and config values corrected throughout; vbincubationcompat
  (removed) dropped from Mod roles.

**Re-verified 2026-09-14 on a fresh world:** 4/4 scripts with 0 errors, 24
quests and 5 chapters, `Applied 15 default gamerules`, and `level.dat` shows
`doTraderSpawning` true with warden/insomnia/patrols off and raids disabled.
Wolf trade confirmed in a trader's stock at 24 emeralds.

---

## Core premise

Animals and crops are the progression. You farm, you sell, you buy better
animals, you farm more. Combat is removed entirely, but **hunger stays** — the
game runs on Normal difficulty, not Peaceful, because hunger is what makes food
production matter.

Three systems interlock:

```
  farm output ──sell──> emeralds ──buy──> livestock ──breed──> farm output
                 (selling bin)      (wandering trader)
```

Nothing else generates emeralds. Nothing else supplies animals. That's
deliberate — a single faucet and a single sink means the numbers are yours.

**Two reward channels, two different verbs.** The bin rewards *volume* — it pays
per item and can't see quality, because produce carries no genetic data. Quests
reward *husbandry* — breeding a high-yield animal or a deep bloodline. Without
the quest layer, selective breeding would be invisible to the economy.

---

## 1. Combat removal

Difficulty stays **Normal** so hunger, natural regeneration costs, and food
value all still work. Peaceful would have been simpler but removes the hunger
loop, which is the point of a farming pack.

| Layer | Mechanism |
|---|---|
| Hostile spawns | **In Control!** — catches spawners, structures, and modded spawn logic in one pass |
| Spawns that bypass spawn logic | `gamerules.js` — warden, phantoms, patrols, raids |
| Illager structures | Empty structure sets — outposts, mansions |

**Why In Control! and not a biome modifier.** A `neoforge:remove_spawns` biome
modifier only edits biome spawn lists. Dungeon and mineshaft spawners, structure
spawns, and modded spawn systems all ignore it. In Control! evaluates at spawn
attempt time, so one rule covers everything. The per-attempt cost is negligible
when almost nothing spawns.

**Why gamerules on top.** Some spawns never go through spawn logic at all:

- `doWardenSpawning` — wardens emerge from sculk shriekers, a block mechanic.
  **This is the biggest hole in an In Control!-only setup.** Without it, a player
  wandering into a Deep Dark meets the one mob that can't be fought or outrun.
- `doInsomnia` — phantoms fire off a sleep timer
- `doPatrolSpawning`, `disableRaids` — their own schedulers

The In Control! side is a single rule in `config/incontrol/spawn.json`:
`{"hostile": true, "result": "deny"}`.

**`doTraderSpawning` must stay `true`.** It sits right next to the patrol rule
and looks like it belongs with the spawns being switched off, but the wandering
trader is the pack's only livestock source. It was briefly `false` by mistake.

**Gamerules apply once per world.** The script sets a `packGamerulesApplied`
flag in persistent data and skips on later loads, so editing `gamerules.js` does
nothing to an existing world. Set `ALWAYS_APPLY = true` or use `/gamerule` by
hand to change a world that already has the flag.

**Trade-off accepted:** removing mansions and outposts removes allays and totems
of undying. Allays are bought back through the trader; totems are irrelevant with
no combat.

---

## 2. The economy — wd's Selling Bin

Chosen over villager trading because it ships **zero trades by default**. The
whole price curve is authored rather than inherited, and it can't be
trading-hall-optimised.

**Scale: 1 emerald = 100 value.** Fine enough that wheat can be 8 without
rounding to zero. The bin accumulates leftover value and pays out at whole
units, so a green bar fills toward the next emerald — selling by the stack is
the intended mode.

### Price philosophy

| Tier | Range | Intent |
|---|---|---|
| Raw crops | 6–20 | Subsistence. Farming alone shouldn't pay well. |
| Animal products | 10–40 | Better than crops. This is the pack's theme. |
| Processed / cooked | 40–220 | Where the money is. |
| Sniffer crops | 90 | Jackpot, ties the trader to the economy. |
| Truffles | 50 | Pig husbandry payoff. Below sniffer crops so the 7-9 block sniffer keeps its edge. |

Buying a sniffer (7–9 emerald blocks) unlocks torchflowers and pitcher plants at
90 each — the most expensive purchase partly pays for itself.

### Farmer's Delight meals — derived, not guessed

```
value(dish) = (sum of cheapest legal ingredients / servings) * 1.5
```

Computed from the mod's **actual recipe JSONs**, not from memory. 80 Farmer's
Delight entries in the shipped `selling_bin_value.json`.

**Cheapest legal, not typical.** Many recipes accept a category — "any
vegetable", "any raw meat". Players optimise, so pricing on the cheapest valid
recipe makes 1.5x a *floor* on profit. Pricing on typical inputs would let cheap
substitutes print money.

This is why **animal dishes out-earn vegetable ones with no special-casing** —
the Honey Glazed Ham feast block 143.7 vs Ratatouille 45, purely because meat and milk cost more
going in. The incentive falls out of the recipe tree.

**Two rules the generator enforces:**
- Raw crops never get the multiplier (cabbage computed to 12 from its own
  two-leaf recipe — inflating a crop because it happens to be craftable)
- Compression never gets the multiplier (rice bag computed to 121.5 against 81
  for the nine rice inside)

Chained recipes resolve to fixpoint: tomato sauce is itself a cooking recipe, so
it's valued before Pasta with Meatballs consumes it.

---

## 3. The wandering trader — livestock supply

Vanilla trades cleared. Four tiers:

| Tier | Level | Price | Contents |
|---|---|---|---|
| Common livestock | 1 | 6–22 | chicken, pig, sheep, cow, rabbit, goat, bee |
| Uncommon livestock | 1 | 18–34 | horse, donkey, llama, cat, wolf, fox, turtle, camel |
| Supplies | appended | 12–28 | waystone, ender pearl, blaze rod, ghast tear — 1 per trader |
| Rare | 2 | 36–60 | mooshroom, panda, axolotl |
| Top tier | 2 | 7–10 **blocks** | sniffer, allay |

**Level 1 vs 2 is the real rarity knob.** He draws several from level 1 and
exactly one from level 2. A large level-1 pool means each trader shows a random
subset — that's what makes him worth hunting rather than a vending machine.

**Supplies are outside the random pool.** Vanilla draws 5 from level 1. With
supplies in that pool it was 5 from 19, so any one animal showed up 26% of the
time and supplies took about one slot per trader. Now level 1 is livestock only
(5 from 15, 33% per animal), and `MoreJS.postUpdateOffers` appends
`SUPPLY_SLOTS` (1) random supply after the draw. Supply availability is
unchanged; livestock gets all five slots. `VillagerUtils.createSimpleTrade`
builds a trade without registering it in a pool.

### Spawn rate (vanilla, unchanged)

Every 24,000 ticks the spawner rolls: ~25% chance, rising to 50% then 75% on
failure, reset to 25% on success. Average **~2.2 in-game days (~45 real
minutes)** between traders, assuming a valid spawn spot near a player. He
despawns after 2 days. The timer counts ticks, so sleeping through the night
doesn't bring him sooner — with one-player sleep on, he feels like one per 4–5
mornings. A fresh world's `level.dat` shows `WanderingTraderSpawnDelay 24000`,
`WanderingTraderSpawnChance 25`.

A player hunting one *specific* common animal waits ~3 traders (~2+ hours).
Wild passive mobs still spawn in the start biomes (In Control! only denies
hostiles), so the trader may matter less for the first herd than for
uncommon/rare stock. Further fixes deferred to playtest — see Open Questions.

**Prices above 64 emeralds are clamped** by the stack limit — a payment slot is
one ItemStack. Sniffer and allay bill in emerald blocks to get above it.

`priceMultiplier(0)` on everything — demand drift makes no sense for someone who
wanders off.

---

## 4. Sourcing — what replaced mob drops

With hostiles gone, several crafting chains lost their inputs. Each was resolved
by asking what it gates, not by reflex.

| Item | Source | Reasoning |
|---|---|---|
| String | Cutting board: 1 wool → 2 string, shears | Farm-native, thematic |
| String (cobweb) | Break cobweb with a knife | Replaces the sword's one farm use; see Swords below |
| Bone | Craft: 3 bone meal → 1 bone | Exact inverse of vanilla, no loop. Gates wolf taming + bone broth |
| Slimeball | Craft: wheat dough + lime dye | Dough is sticky, dye is green. Whole chain is agricultural |
| Green dye | Craft: 4 leaves → 1 | Vanilla's only source is smelted cactus. Leaves are everywhere, so the slime chain no longer waits on finding a desert |
| Ender pearl | Trader | Sophisticated void upgrades, storage tool |
| Blaze rod | Trader | Sophisticated upgrades |
| Ghast tear | Trader | Sophisticated upgrades |
| Leather | Canvas added to `c:leathers` | Canvas is 4 straw, straw from grass/rice. Killing breeding stock cut against the premise |

**Deliberately not sourced:**
- *Gunpowder* — only TNT, rockets, fire charge. Rockets are moot without elytra.
- *Phantom membrane* — only elytra repair and slow falling. Both dead here.
- *Fermented spider eye* — would need brewing, which needs nether wart. Brewing
  is a combat-support subsystem; cut entirely.

### Swords: removed

With no combat, the sword's only farm job was cobweb → string. Axes are the
better culling tool, and the Farmer's Delight knife is better still since it
guarantees drops. So swords are gone: `no_swords.js` removes all six recipes
and strips `#minecraft:swords` from every loot table through a LootJS modifier
(vanilla chests, Better Archeology, mob equipment), and `hide_swords.js` hides
them from JEI. The items still exist in the registry; nothing produces them.

**The knife already does cobwebs — no recipe needed.** `KnifeItem` is a
`DiggerItem` built on `farmersdelight:mineable/knife`, and that tag includes
`minecraft:cobweb`. Being in the tag makes the knife the correct tool, so the
vanilla cobweb loot table (cobweb with shears or silk touch, otherwise string)
drops string. This holds for the flint knife too.

**Tool swapper upgrade** was the only recipe in the pack that consumed a sword
(wooden sword). It now takes `#c:tools/knife`. Nugget smelting recipes still
accept swords as input; harmless with no swords in circulation.

### The pre-iron tier

With no villages (no golems) and no hostile mobs (no drops), iron is mining-only.
That made "go mine before you can milk a cow" a mandatory opening beat, which is
the wrong first hour for a farming pack.

Fix: the day-one toolkit skips iron entirely.

| Tool | Made from | Source |
|---|---|---|
| Knife (cutting board) | Flint | Farmer's Delight, already vanilla-ish |
| Shears | 2 copper ingots | `shears_from_copper.json` |
| Bucket | 3 copper ingots | `bucket_from_copper.json` |

Both are **additional** recipes using `c:ingots/copper`, not replacements — the
iron versions still exist, and JEI shows two recipes each.

This also fixes copper. It's abundant, renewable via drowned, and in vanilla
almost purely decorative — a long-standing complaint that a backport mod was
considered and rejected for (Copper Age Backport 0.1.4 crashes on its own
duplicate armor material registration). Making copper the early-game tool metal
is roughly where Mojang is heading anyway.

Iron stays relevant for hoppers, minecarts, and Sophisticated upgrades.

### Substituting an ingredient everywhere: use the convention tag

Sophisticated has dozens of leather recipes. Overriding each one would mean
dozens of files and permanent maintenance. Instead, **add the substitute to the
tag the recipes already use**:

```js
ServerEvents.tags('item', function (event) {
  event.add('c:leathers', 'farmersdelight:canvas')
})
```

One line, covers every recipe using `c:leathers` — including mods not yet
installed.

**Most modded recipes use NeoForge convention tags** (`c:leathers`, `c:strings`,
`c:ingots/iron`) rather than raw item IDs. A few hardcode the item anyway, so a
narrow `replaceInput` mops those up:

```js
event.replaceInput({ mod: 'sophisticatedbackpacks' },
                   'minecraft:leather', '#c:leathers')
```

**Vanilla is unaffected** — vanilla recipes reference `minecraft:leather`
directly and aren't in the mod filter. That's deliberate: canvas leather armor
reads wrong. Item frames get their own explicit recipe instead.

**No money loop**, because canvas is only *accepted alongside* leather, never
converted into it. Leather keeps its bin value of 20; canvas stays unpriced.
A `canvas -> leather` recipe would have opened grass → straw → canvas → leather
at 20, from an infinitely renewable input.

#### Dump the recipe before theorising

The first attempt failed silently because it targeted `minecraft:leather` while
the backpack recipe actually used `{"tag": "c:leathers"}`. Invisible from
outside. `forEachRecipe` with a filter prints the real JSON:

```js
ServerEvents.recipes(function (event) {
  event.forEachRecipe({ mod: 'sophisticatedbackpacks' }, function (r) {
    console.info('[probe] ' + r.id + ' => ' + r.json)
  })
})
```

Same lesson as the NBT work: dump the actual data structure rather than
reasoning about what it probably looks like.

### Dimensions

**Nether: open.** Never blocked, and In Control! strips its mobs. A quiet
resource run for soul sand, quartz, and wart if brewing ever returns. Trader
rods and tears are convenience, not the only path.

**End: effectively closed.** Not by rule — eyes of ender are craftable from
trader pearls and rods — but nothing needs it. Shulkers are redundant with
Sophisticated Storage; elytra is redundant with waystones.

---

## 5. Travel and starting conditions

**Waystones.** Wild generation at 20-chunk spacing (`chunksBetweenWildWaystones`) carries fast travel now that
villages are gone (`spawnInVillages` is dead config). Also purchasable at 20–28,
**priced against the horse** — both are transportation, so the player picks.

`transportLeashed = ENABLED` means livestock ride along. A waystone network
doubles as animal transport.

**Biome Spawn Point** guarantees a workable start: plains, sunflower plains,
meadow, forest, birch forest, flower forest, cherry grove. All have grass and
wood. (Earlier versions of this doc listed only four; meadow, flower forest and
cherry grove are in the config too.)

**Villages: removed.** The bin replaced their role as emerald faucet, and a
trading hall would have undercut the authored price curve. Guard Villagers and
Improved Village Placement removed alongside.

---

## 5b. Shaders and release

**Distribution: Modrinth `.mrpack`, exported from Prism.** Mods and the shader
are referenced by Modrinth download URL (their `.pw.toml` metadata), never
re-uploaded.

**Shipped shader: Complementary Reimagined r5.9.1, off by default.**
`config/iris.properties` has `shaderPack=ComplementaryReimagined_r5.9.1.zip`
and `enableShaders=false`. Players turn it on with **K** or Video Settings →
Shader Packs. Off because jam players are on unknown hardware — Solas at its
HIGH defaults visibly chugged a Steam Deck.

**Why Reimagined.** Its license (Complementary License Agreement 1.7, §1.2)
explicitly allows modpack inclusion when: added through Modrinth/CurseForge's
systems (not a file upload), contents unmodified, and problems are the pack
author's responsibility. Visible credit on the pack page is required *if it's
enabled by default* — it isn't, but credit it anyway. Lighter than Unbound.

**Not shipped:**
- *Solas* — Modrinth license is `LicenseRef-All-Rights-Reserved`, no modpack
  permission stated. Would need Septonious's permission first.
- *Complementary Unbound* — allowed, but heavier than Reimagined.

Both stay installed locally. Git tracks only
`shaderpacks/complementary-reimagined.pw.toml`.

**Local vs shipped.** This instance is both the dev install and the release
source. Toggling shaders or switching packs in game rewrites
`config/iris.properties` — check `git diff config/iris.properties` before
committing so a local preference doesn't ship. Shader *settings* live in
`shaderpacks/<pack>.zip.txt`, untracked, so local tuning never ships.

### Cleaning the export — `tools/clean_mrpack.py`

Prism's Modrinth export puts everything in `minecraft/` into `overrides/`.
The first export (2026-09-14) was 18.2 MB and shipped: `usercache.json` (dev
username + UUID), `command_history.txt`, Xaero waypoints, SimpleBackups data
for every test world, Crash Assistant's copied jars, mixin dumps, the dev's own
`options.txt` (fullscreen, 30 FPS cap, inverted mouse), the Resourceful Config
web password and the KubeJS web server auth token.

The script rebuilds the pack with an **allowlist** of overrides (`config/`,
`kubejs/`, `icon.png`) minus a deny list (web password, KubeJS token,
`config/sounds/chat.json` whose mention keyword is the dev's username,
per-world JEI history, `*_backup*`). It swaps in `tools/release/options.txt`,
drops `.disabled` mods and any shader other than Reimagined from the index,
and exits non-zero if it finds a jar in overrides or a non-Modrinth download.
Clean result: 0.3 MB, 173 downloads, 317 override files. The input is never
modified.

New mods that write files to `minecraft/` are excluded by default — if
something needs to ship, add it to `ALLOW` in the script.

**Export-time patches (`TOML_PATCHES`).** Some shipped configs hold dev-machine
preferences. Rather than change the dev instance, the script rewrites them in
the pack only, and reports a PROBLEM if a target key disappears:

| File | Setting | Dev | Shipped |
|---|---|---|---|
| `config/chloride-client.toml` | `[fullscreen] mode` | FULLSCREEN | WINDOWED |
| `config/chloride-client.toml` | `[fpsDisplay] mode` | ADVANCED | OFF |

Found by the first import test: Chloride applies its window mode at boot, so
every player started fullscreen (the `options.txt` `fullscreen` line doesn't
matter — Chloride overrides it). When a fresh import looks wrong, suspect a
shipped config before `options.txt`.

**`tools/release/options.txt`** is the shipped options file: only `version`,
`resourcePacks` and `incompatibleResourcePacks` (Comforts Modernized is flagged
incompatible but works — without that line Minecraft silently disables it).
Everything else falls back to Minecraft's defaults. If a resource pack is added
or reordered, copy the two pack lines from the dev `options.txt` into it.

It also fixes default keybind conflicts. Only binds that clash *in normal
gameplay* matter — JEI's mouse/shift binds, Jade on Shift, TrashSlot on T and
Sophisticated's `[`/`]` are menu-only or intentional.

| Key | Default clash | Shipped |
|---|---|---|
| B | Xaero new waypoint ↔ Backpacks open backpack | Backpacks keep **B**; Xaero waypoint → **N** |
| N | (knock-on) Xaero waypoint ↔ TreeChop settings overlay | TreeChop → **J** |
| C | Chloride zoom ↔ Backpacks inventory interaction | Backpacks keep **C**; zoom → **Z** |
| Z | (knock-on) zoom ↔ Xaero enlarge minimap | Xaero enlarge **unbound** (world map still on M) |
| K | Iris toggle shaders ↔ KubeJS Kubedex | Kubedex **unbound** (dev tool); K stays shaders, as §5b tells players |

C is still shared with vanilla's "save hotbar activator", which only works in
creative. Key lines use the exact `key_<id>` names from a real `options.txt` —
a typo is silently ignored, so copy names rather than typing them. Adding a mod
can introduce new clashes: check Controls (Controlling highlights conflicts).

### Before exporting a release

- [ ] `config/iris.properties`: `enableShaders=false`,
      `shaderPack=ComplementaryReimagined_r5.9.1.zip`.
- [ ] Prism → Export → Modrinth with defaults, to `~/cowpewter-bap.mrpack`.
- [ ] `python3 tools/clean_mrpack.py ~/cowpewter-bap.mrpack` → uploads
      `~/cowpewter-bap-clean.mrpack`. Exit code 0 and no `PROBLEMS` block.
      Read the "dropped overrides" list for anything that *should* ship.
- [ ] Pack description credits Complementary Reimagined (EminGT) with a link.
      Draft page copy: `docs/modrinth-description.md` (summary in the header
      comment). Update it when features change.
- [x] Modrinth project icon: `tools/icon/icon.png` (512px). The same image is the
      instance `icon.png`, which ships in the export and becomes the Prism
      icon on import. Uploaded to Modrinth and set on the BAP instance 2026-09-14.
- [ ] Modrinth license: **MIT** (chosen 2026-09-14). Covers the pack's own
      scripts, quests and configs only; the description says so. All 174
      referenced projects were checked — none constrain the pack's license.
      BlayTheNinth's mods (Waystones, Balm, TrashSlot, Client Tweaks) forbid
      using their mod names in the pack title.
- [ ] Pack name everywhere it shows. The export is still named
      `cowpewter-bap` / `0.0.1-alpha`:
      - Prism export dialog: name **Seed & Stock**, version e.g. `1.0.0`
      - Modrinth project title **Seed & Stock: Swords to Ploughshares**
      - optional: Getting Started quest text
      - done 2026-09-14: crash screen `modpack_name = "Seed & Stock"`,
        window title `Seed & Stock: Swords to Ploughshares`
- [x] **Create the public issues repo `cowpewter/seed-and-stock-issues`**
      (exact name; Issues enabled). The main repo is private, so crash reports
      go here. Crash Assistant already points at
      `https://github.com/cowpewter/seed-and-stock-issues/issues/new` with
      GitHub wording ("Report the issue on the Seed & Stock issue tracker").
      Created 2026-09-14; GitHub API confirms public, `has_issues: true`.
      Has issue forms (`.github/ISSUE_TEMPLATE/`: crash report asking for the
      Crash Assistant *Upload all* message, bug, feedback/balance; blank issues
      off; labels `crash`/`bug`/`feedback`) and a README.
      - [ ] Set the Modrinth project's *Issues* link to the same repo.
      Without this, `help_link` was `CHANGE_ME`, which sends crashing players
      to the NeoForge Discord.
- [x] Import the `.mrpack` into a fresh Prism instance and launch once. Check
      its `options.txt`: resource packs enabled, shipped binds applied, and no
      new in-game keybind clashes. Done for the 2026-09-14 alpha export: 164
      mods, 8 resource packs, Reimagined present with shaders off, all binds
      applied. Remaining shared keys are all menu-vs-world (A, R, T, U, `]`)
      or creative-only (C). That import booted fullscreen (Chloride config);
      fixed by export-time patch. Re-import confirmed windowed, no FPS
      overlay, and a world created from the download: 5/5 server scripts, all
      `[cowpewter_bap]` lines, 24 quests / 5 chapters, `Applied 15 default
      gamerules`, no registry or selling_bin data map errors.

---

## 6. Quests — Questlog

**24 quests across 5 chapters.** Two jobs: teach the pack's custom systems to
someone new to modded Minecraft, and reward husbandry (which the selling bin
can't see).

### File layout

```
config/questlog/quests/*.json      one file per quest
config/questlog/chapters/*.json    one file per chapter
```

**Filenames are IDs.** `01_first_breeding.json` is `questlog:01_first_breeding`;
renaming breaks anything referencing it. `/ql reload` hot-reloads both.

### Chapter schema — `name`/`order`, not `title`/`sort_order`

Quests and chapters use *different* field names. Chapters:

```json
{
  "name": "The Herd",
  "icon": { "item": "minecraft:cow_spawn_egg" },
  "order": 2,
  "default_chapter": false,
  "hidden": false
}
```

Got this from `/ql edit_mode`, which writes a correct file you can copy. Worth
doing for any schema the wiki doesn't cover.

**`main` must exist and can't be usefully hidden.** Setting `hidden: true` on it
didn't remove it from the GUI. The fix is to give main a real job: `main.json`
*is* the Getting Started chapter (`default_chapter: true`), and the intro quests
simply omit their `chapter` field so they fall into it. No empty chapter.

| Chapter | File | Contents |
|---|---|---|
| Getting Started | `main.json` | no combat, JEI, flint knife, copper tools |
| The Herd | `farm.json` | breeding, care system, genetics, truffles |
| The Market | `market.json` | selling bin |
| The Kitchen | `kitchen.json` | cutting board, cooking pot, rich soil |
| Hauling & Storage | `storage.json` | backpack, upgrades, deposit-to-bin |

### Writing for newcomers

**Unknown item ID → use `questlog:read` instead of a craft objective.** A read
objective completes on opening the quest, so the information still lands and a
wrong ID can't break anything.

To *get* the IDs, read the mod's lang file rather than hunting in-game:

```bash
unzip -p AnimalHusbandry-neoforge-0.4.1.jar \
  assets/animalhusbandry/lang/en_us.json | grep item
```

Note jar filenames are often capitalised — `ls | grep -i <mod>` first. Blocks are
under `block.` not `item.`, so grep both.

**Teach by pointing at the game, not by explaining.** `32_first_meal` tells the
player to shift-hover a cooked meal and compare its price to its ingredients —
they discover the processing incentive as a number rather than being told about
it. Several quests say "press U on X in JEI" instead of listing recipes.

**Tie mod features back to this pack.** The feeding upgrade is framed as the
answer to hunger being on; the deposit upgrade as one-click selling into the bin.
Generic mod documentation is what the mod pages are for.

## 7. NBT-based quests — the unobtainable + command bridge

**Questlog has no objective that reads entity or world state.** It tracks
*events* — you bred, you obtained, you used — not conditions. So "own an animal
with high yield" is not directly expressible.

The workaround uses two documented features together:

1. **`questlog:unobtainable`** — an objective no player action can complete.
   Explicitly intended for externally-triggered quests, and hidden from the
   objective list in the GUI.
2. **`/questlog progress complete <quest> <player>`** — completes it from
   outside. Needs permission level 2; `runCommandSilent` from a KubeJS server
   script has it.

So: KubeJS evaluates whatever condition you like, then fires the command.

```js
ItemEvents.entityInteracted(function (event) {
  // ... read state, test it ...
  event.server.runCommandSilent(
    'questlog progress complete ' + QUEST_ID + ' ' + event.player.username)
})
```

This generalises to anything KubeJS can see: happiness thresholds, herd size,
trait combinations, domestication counts, block placement patterns.

### Reading entity NBT in KubeJS 2101

**`entity.fullNBT` returns `undefined`.** The working accessor is **`entity.nbt`**.
Wasted a cycle discovering this — the older `fullNBT` appears throughout
1.20-era docs and examples.

### Where Animal Husbandry keeps genetics

Not in plain entity NBT — in a **NeoForge data attachment**:

```
entity.nbt["neoforge:attachments"]["animalhusbandry:genetics"]
  producYield    float 0.0-1.0    <- note the mod's typo, not "produceYield"
  constitution   float 0.0-1.0
  fertility      float 0.0-1.0
  growthRate     float 0.0-1.0
  generation     int              <- increments per breeding; best breeding metric
  trait          string           ("none", "glutton", "cuddly", ...)
  pattern, primaryColor, isMale, animalId

entity.nbt["neoforge:attachments"]["animalhusbandry:care_data"]
  Happiness, IsDomesticated, IsSick, IsPregnant, DaysSinceFed, ...
```

Any modern 1.21 mod may store state this way, so check
`neoforge:attachments` before concluding data isn't there.

### Rhino is not Node

KubeJS's JS engine rejects things Node accepts. Two that bit us:

- **`const`/`let` inside a loop body** — treated as a redeclaration on the second
  iteration: `TypeError: redeclaration of var s`. Use `var`, declared once above
  the loop.
- Prefer indexed `for` loops and `function () {}` over `for...of`,
  destructuring, and arrow functions.

A `node --check` pass catches syntax errors but **not** these — they only appear
at runtime.

### Produce carries no genetics

A high-yield cow's milk bucket is a plain milk bucket. So the selling bin cannot
price quality, and better animals pay through **volume only** — higher yield
means more items, which means more emeralds. Quests carry the quality reward
instead. Changing that would need the Animal Husbandry author to tag produce with
a data component first, then wd to write a matching Selling Bin processor.

---

## Balance invariants

Break these and something becomes a money loop:

- **Slimeball ≤ 13 in the bin** (currently unpriced). Crafting cost is dough (8) + lime dye (~5).
- **Green dye and leaves stay unpriced**, or 4 leaves → 1 dye becomes a loop.
- **Straw is unpriced** (removed) and **canvas must stay unpriced**. Straw comes
  from cutting grass, which is infinite. Never add a `canvas -> leather` recipe
  while leather is worth 20. Both are in the price script's `NEVER_PRICE`, which
  strips them from the bin on every run — the old script still emitted straw
  at 2, so regenerating would have silently reopened the loop.
- **Tree bark is unpriced** (removed 2026-09-14). A log-stripping byproduct,
  not farm produce. Also in `NEVER_PRICE`.
- **String ≤ 6 in the bin** (currently unpriced). 1 wool (12, priced via `#minecraft:wool`) → 2 string.
- **Compression is never worth more than its parts.** Crates, bags, bales.
- **Currency map needs ≥ 2 entries.** A single-entry
  `selling_bin_currencies.json` makes the bin resolve to `minecraft:air`
  (Selling Bin 1.6 bug).

---

## Before a playtest run

- [ ] **Commit or back up.** `kubejs/` and `config/` are in git (see Version
      control). Mods and saves are not — copy those separately.
- [ ] **Fresh world.** The test world has had structure sets added mid-life,
      gamerules applied, and quests completed then reset — early-game pacing
      can't be measured on it.
- [ ] `/ql progress reset all` if reusing a world (Prize Stock was completed
      during threshold testing).
- [ ] Confirm `/ql reload` reports **24 quests and 5 chapters**.
- [x] On the fresh world, confirm the log shows
      `[cowpewter_bap] Applied 15 default gamerules`, then check
      `/gamerule doTraderSpawning` is `true`. The test world never ran the
      current script from scratch (it was converted to Rhino-safe `var` style
      on 2026-09-14).
- [x] Check a wandering trader offers a wolf somewhere in the uncommon pool.
- [x] Swords: no recipes or JEI entries; knife breaks cobweb into string;
      tool swapper upgrade shows a knife in JEI. All verified 2026-09-14
      (log: both sword lines, `removed 6 recipes, modified 5` — the canvas
      script accounts for 4 of those 5).
- [x] Trader shows 5 livestock offers + 1 rare/top-tier + exactly 1 supply,
      and no errors from `wanderer_trades.js` when he spawns. Verified
      2026-09-14: 6 animals + ender pearl, clean log.
- [x] Sword loot removal. Verified 2026-09-14 by rolling
      `/loot give @s loot betterarcheology:archeology/sword_loot` repeatedly
      (a swords-only table): nothing dropped. Quick way to test any loot
      change without finding a chest.
- [ ] Watch quest *pacing* — 24 quests is a lot to unlock in the first hour if
      the gates are loose, or never see if they're tight.
- [ ] Put `YIELD_THRESHOLD` back to 0.85 if it was lowered for testing.
- [ ] Verify in JEI: copper shears/bucket show as *second* recipes, backpack
      accepts canvas, green dye from leaves exists.

---

## Open questions

- **Is 1.5x the right cooking multiplier?** Untested in play. The read: sell a
  stack of wheat, then bread made from the same wheat. Clear gap = working.
  Marginal = raise it. Nobody selling raw = lower it.
- **Is the emerald rate right?** Needs a play session, not a spreadsheet.
- **Does early game work?** Spawn guarantees terrain and animals, and the
  pre-iron tier (flint knife, copper shears and bucket) means no mining detour,
  but a new player still has no emeralds until the first harvest sells.
- **Wandering trader spawn rate is load-bearing.** Vanilla averages ~2.2
  in-game days between traders (§3). Pool split done 2026-09-14; the rest waits
  on playtest. Watch: do wild animals carry the first herd? Do uncommon/rare
  tiers feel reachable? If not, options in order of effort:
  - *Scripted spawns* (KubeJS): guaranteed trader around day 2–3, then every
    N days near a player. Simple, tunable, invisible to the player.
  - *Summon him* (KubeJS + block/item + quest): e.g. ring a market bell, he
    arrives next morning, multi-day cooldown. Turns his arrival into a player
    choice — fits farm → sell → buy best. Most work.
- **"Nothing else supplies animals" may be false.** Start biomes still spawn
  wild cows, sheep, pigs and chickens. Confirm at playtest and reword §Core
  premise if so.
- ~~Nothing teaches any of this~~ — resolved. 24 quests across 5 chapters cover
  no-combat, JEI, the pre-iron tier, the care system, the bin, cooking and
  storage. Untested for pacing.
- **Warm chickens / brown eggs** — cold half verified end to end, warm half never
  tested. Same machinery, so likely fine. Note the cold test was done while
  vbincubationcompat (variant egg nests) was still installed; it has since been
  removed, so re-check that variant eggs still hatch the right variant.
- **Are the genetics thresholds right?** `YIELD_THRESHOLD` 0.85 and
  `GEN_THRESHOLD` 5 are guesses. Only data point: a wild cow at 0.562 yield,
  generation 0. Watch the readout across a few generations and adjust.
- **Keep, repurpose, or remove Better Archeology?** Decide after the first
  playtest. As shipped it's mostly adventure content: combat totems (Soul,
  Radiance, Torrents), Rusty Bomb, Evoker Trap, dead enchantments (Penetrating
  Strike, Soaring Winds), ~25 structures including spawner catacombs made inert
  by In Control!. The fit is the dig-and-reward loop — exploration is already
  required to find new crop seeds.
  - *Repurpose:* disable combat items in `config/betterarcheology.jsonc`
    (each totem and enchantment has its own toggle), then use LootJS to refill
    dig loot with farm rewards — rare seeds, Totem of Growth as the jackpot
    (tunable radius and grow chance), fossils. Bomb and Evoker Trap need LootJS.
    A few hours of work plus in-game verification.
  - *Remove:* if wild crop patches alone carry exploration.
  - *What to watch:* do players stumble into dig sites while hunting seeds, and
    do they bother brushing? If yes, repurpose. If they ignore them, remove.
  - If the Totem of Growth stays, it raises crop output and therefore emerald
    income — price it into the economy.
- ~~Wolves and cats have no source~~ — resolved. Both now in the trader's
  uncommon tier (cat 18-26, wolf 20-28). Taming needs bone (craftable from bone
  meal) and raw fish (fishing works). The wolf entry was missing from the script
  until the 2026-09-14 audit.

---

## Things that bit us (so they don't again)

**One malformed entry discards an entire NeoForge data map.** Wall Lanterns had a
bad `next_oxidation_stage` key and silently killed *all* copper oxidation and
waxing game-wide. No crash, nothing in the log until a world loaded.

**A data map file's name IS its ID.** `selling_bin_value_farmersdelight.json` was
silently ignored — only `selling_bin_value` is registered. Merging happens when
datapacks share a path, not by adding filenames. The price script now writes to
`selling_bin_value.json` directly so this can't recur.

**Generators undo hand edits.** Straw was removed from the bin by hand, but the
price script still produced it — the next regeneration would have put it back.
Anything removed for balance reasons belongs in the generator's exclusion list,
not just the output file.

**Missing from JEI ≠ broken in game.** A recipe absent from JEI failed to *parse*.
Present but not working means the inputs or tool don't match. Different causes.
The wool→string recipe used `"sound": "minecraft:entity.sheep.shear"` when the
codec wanted `SoundEvent.DIRECT_CODEC` — recipe rejected outright.

**Registry and data-map problems only appear when a world loads.** Reaching the
main menu proves nothing. Both real bugs in this pack were invisible until world
creation.

**Backport mods with overlapping version ranges collide.** MoreMobVariants
shipped 1.21.5-format wolf variants against a 1.21.1 codec — instant crash on
world create. Check `data/<modid>/*_variant/*.json` before installing: an
`assets` block plus `spawn_conditions` means new format and a crash. The build
now installed (`moremobvariants-V1.0.0.jar`) declares `[1.21.1,1.22)` and loads
worlds cleanly.

**Once-per-world scripts hide their own bugs.** `gamerules.js` gained a
`doTraderSpawning: false` line after the test world had already applied its
rules, so the test world stayed correct and the bug was invisible. Anything
guarded by a persistent-data flag has to be verified on a fresh world.

**Check the files, not the doc.** The 2026-09-14 audit found the wolf trade
documented as done but never added, and several counts out of date. When the
doc says "resolved", grep for it.

**KubeJS has no worldgen API on 1.21.** `WorldgenEvents` doesn't exist; the
maintainer says use datapacks and biome modifiers. Mods you dismissed as
redundant with KubeJS may not be.

---

## Mod roles

| Mod | Role |
|---|---|
| In Control! | Hostile spawn suppression |
| wd's Selling Bin | Emerald faucet, data-driven prices |
| MoreJS | Wandering trader trades (KubeJS core can't — wontfix) |
| KubeJS + LootJS | Scripts, virtual datapack for all data files |
| Farmer's Delight | Cooking depth, cutting board, rich soil |
| Vanilla Backport | Cold/warm animal variants, Freshly Animated compat |
| Waystones | Fast travel, wild generation |
| Biome Spawn Point | Guaranteed workable start |
| Sophisticated Storage/Backpacks | Storage progression; taught in the storage chapter |
| Caged and Boxed | Mob transport |
| Questlog | Quests, JSON-driven, `config/questlog/quests/` |
| Farmer's Delight (canvas) | Leather substitute via `c:leathers` |
| Animal Husbandry | Genetics, care, domestication — the pack's core loop |
| Iris + Complementary Reimagined | Optional shaders, shipped off by default (§5b) |

Installed but not yet discussed in this doc. Roles below are what the mods do,
not decisions recorded here yet:

| Mod | What it does | Note |
|---|---|---|
| Horseman | Horse and mount improvements | Overlaps the horse/waystone transport choice (§5) |
| Via Romana | Fast travel along built paths | A third transport option alongside horse and waystone |
| Gliders | Craftable gliders | The End reasoning (§4) says elytra is redundant with waystones; gliders are another substitute |
| Better Archeology | Expanded archaeology and structures | New structures are covered by the In Control! deny rule |
| More Mob Variants | Extra visual variants for passive mobs | See "Things that bit us" |
| Comforts | Sleeping bags and hammocks | |
| Gravestone (+ Curios compat) | Keeps items on death | Deaths still happen from falls, drowning, starvation |
| Open Parties and Claims | Land claims | Multiplayer |
| Right Click Harvest, TrampleNoMore, Universal Bone Meal | Farming quality of life | |
| JEI, Just Enough Resources, Jade, AppleSkin | Information | Quests point players at JEI |

Libraries with no gameplay of their own: Almanac (required by Let Me Despawn),
Necronomicon (required by Questlog), Triggers (bundled inside Questlog).
