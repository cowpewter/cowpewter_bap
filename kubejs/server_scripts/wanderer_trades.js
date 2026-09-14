// kubejs/server_scripts/wanderer_trades.js
// Turns the wandering trader into the pack's livestock supplier.
// Requires MoreJS (morejs-neoforge-1.21.1-0.16.0 or newer).
//
// NOTE: on 1.21 builds the global is `MoreJS`, NOT `MoreJSEvents` as the
// (2023-era) wiki shows. If this errors again, the name changed once more —
// check the mod's changelog rather than the wiki.
//
// How the wanderer works: he has two internal trade levels.
//   Level 1 = standard pool, he picks SEVERAL from it
//   Level 2 = rare pool, he picks ONE from it
// So a large level-1 pool means each trader shows a random subset —
// which is what makes him worth chasing down.
//
// Vanilla draws 5 from level 1. SUPPLIES are kept OUT of that pool so they
// don't crowd livestock out of those 5 slots; instead postUpdateOffers appends
// SUPPLY_SLOTS of them after the draw. Old odds: 5 from 19 (26% for any one
// animal). New odds: 5 from 15 (33%), plus supplies on top.

const CLEAR_VANILLA = true   // false = keep vanilla's saplings/dyes/etc alongside

// [spawn egg, min emeralds, max emeralds, maxUses]
const COMMON_LIVESTOCK = [
  ['minecraft:chicken_spawn_egg',  6,  10, 3],
  ['minecraft:pig_spawn_egg',      8,  12, 3],
  ['minecraft:sheep_spawn_egg',    8,  12, 3],
  ['minecraft:cow_spawn_egg',     10,  14, 3],
  ['minecraft:rabbit_spawn_egg',  10,  16, 2],
  ['minecraft:goat_spawn_egg',    14,  20, 2],
  ['minecraft:bee_spawn_egg',     16,  22, 2],
]

const UNCOMMON_LIVESTOCK = [
  ['minecraft:horse_spawn_egg',   20, 28, 1],
  ['minecraft:donkey_spawn_egg',  20, 28, 1],
  ['minecraft:llama_spawn_egg',   22, 30, 1],
  ['minecraft:cat_spawn_egg',     18, 26, 1],
  ['minecraft:wolf_spawn_egg',    20, 28, 1],
  ['minecraft:fox_spawn_egg',     22, 30, 1],
  ['minecraft:turtle_spawn_egg',  24, 32, 1],
  ['minecraft:camel_spawn_egg',   26, 34, 1],
]

// Non-livestock goods: things the world no longer provides now that hostile
// mobs are gone. NOT in the level-1 pool — appended after the draw (see
// postUpdateOffers at the bottom). Supplies, not trophies.
//
// Distinct supplies each trader carries. 1 matches the old average (5 draws
// from 19 with 4 supplies = ~1.05 per trader).
var SUPPLY_SLOTS = 1

const SUPPLIES = [
  // Waystone priced against the horse (20-28) — both are transportation, so the
  // player picks which to invest in rather than one obviously winning.
  ['waystones:waystone',      20, 28, 2],

  // Mob drops with no source left in the pack. All gate storage and
  // automation (Sophisticated upgrades, sticky pistons, cardboard boxes), not
  // combat — so they're consumable components, priced below livestock and with
  // generous uses since players need them in batches.
  ['minecraft:ender_pearl',   12, 18, 4],
  ['minecraft:blaze_rod',     14, 20, 4],
  ['minecraft:ghast_tear',    18, 26, 3],
]

// Level 2 — he offers exactly ONE of these, so keep it short and special.
const RARE_LIVESTOCK = [
  ['minecraft:mooshroom_spawn_egg', 40, 56, 1],
  ['minecraft:panda_spawn_egg',     44, 60, 1],
  ['minecraft:axolotl_spawn_egg',   36, 50, 1],
]

// A trade's payment slot is ONE ItemStack, so prices above 64 emeralds get
// silently clamped to 64. Anything pricier must be billed in emerald blocks
// (1 block = 9 emeralds). These are the top-tier purchases.
const BLOCK_PRICED = [
  ['minecraft:sniffer_spawn_egg',   7,  9,  1],   // 63-81 emeralds
  ['minecraft:allay_spawn_egg',     8, 10,  1],   // 72-90 emeralds
]

MoreJS.wandererTrades(event => {
  if (CLEAR_VANILLA) {
    event.removeVanillaTypedTrades()
    event.removeModdedTypedTrades()
  }

  const add = (level, list) => {
    list.forEach(entry => {
      const egg = entry[0]
      const min = entry[1]
      const max = entry[2]
      const uses = entry[3]

      event
        .addTrade(level, [TradeItem.of('minecraft:emerald', min, max)], egg)
        .maxUses(uses)
        .priceMultiplier(0)   // no demand-based price drift on a wanderer
    })
  }

  const addBlockPriced = (level, list) => {
    list.forEach(entry => {
      event
        .addTrade(level, [TradeItem.of('minecraft:emerald_block', entry[1], entry[2])], entry[0])
        .maxUses(entry[3])
        .priceMultiplier(0)
    })
  }

  add(1, COMMON_LIVESTOCK)
  add(1, UNCOMMON_LIVESTOCK)
  add(2, RARE_LIVESTOCK)
  addBlockPriced(2, BLOCK_PRICED)

  console.info('[cowpewter_bap] Registered wanderer livestock trades')
})

// Fires once per trader, after vanilla has drawn his level 1 and level 2
// offers. Appends SUPPLY_SLOTS distinct random supplies.
// Rhino-safe style: var only, indexed loops, no arrows.
MoreJS.postUpdateOffers(function (event) {
  if (!event.isWanderer()) return

  var pool = SUPPLIES.slice()
  var n = Math.min(SUPPLY_SLOTS, pool.length)
  var i, pick, entry, trade
  for (i = 0; i < n; i++) {
    pick = Math.floor(Math.random() * pool.length)
    entry = pool.splice(pick, 1)[0]
    trade = VillagerUtils.createSimpleTrade(
      [TradeItem.of('minecraft:emerald', entry[1], entry[2])],
      TradeItem.of(entry[0]))
    trade.maxUses(entry[3])
    trade.priceMultiplier(0)
    event.addTrade(trade)
  }
})
