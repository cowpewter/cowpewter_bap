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

(function () {
  const CLEAR_VANILLA = true;   // false = keep vanilla's saplings/dyes/etc alongside

  const COIN_100 = 'cowpewter_bap:coin_100';
  const COIN_500 = 'cowpewter_bap:coin_500';

  const getRequestFromPrice = entry => {
    const min = entry[1];
    const max = entry[2];
    // If it's more than a stack, use next coin up
    const divisor = max > 6400 ? 500 : 100;
    return {
      item: divisor === 500 ? COIN_500 : COIN_100,
      min: Math.round(min / divisor),
      max: Math.round(max / divisor),
    };
  };

  // Level 1
  // [spawn egg, min price, max price, maxUses]
  const COMMON_LIVESTOCK = [
    ['minecraft:chicken_spawn_egg',  600,  1000, 3],
    ['minecraft:pig_spawn_egg',      800,  1200, 3],
    ['minecraft:sheep_spawn_egg',    800,  1200, 3],
    ['minecraft:cow_spawn_egg',     1000,  1400, 3],
    ['minecraft:rabbit_spawn_egg',  1000,  1600, 2],
    ['minecraft:goat_spawn_egg',    1400,  2000, 2],
    ['minecraft:bee_spawn_egg',     1600,  2200, 2],
  ];

  const UNCOMMON_LIVESTOCK = [
    ['minecraft:horse_spawn_egg',   2000, 2800, 1],
    ['minecraft:donkey_spawn_egg',  2000, 2800, 1],
    ['minecraft:llama_spawn_egg',   2200, 3000, 1],
    ['minecraft:cat_spawn_egg',     1800, 2600, 1],
    ['minecraft:wolf_spawn_egg',    2000, 2800, 1],
    ['minecraft:fox_spawn_egg',     2200, 3000, 1],
    ['minecraft:turtle_spawn_egg',  2400, 3200, 1],
    ['minecraft:camel_spawn_egg',   2600, 3400, 1],
  ];

  // Level 2 — he offers exactly ONE of these, so keep it short and special.
  const RARE_LIVESTOCK = [
    ['minecraft:mooshroom_spawn_egg', 4000, 5600, 1],
    ['minecraft:panda_spawn_egg',     4400, 6000, 1],
    ['minecraft:axolotl_spawn_egg',   3600, 5000, 1],
    ['minecraft:sniffer_spawn_egg',   6300,  8100,  1],
    ['minecraft:allay_spawn_egg',     7200, 9000,  1],
  ];

  // Non-livestock goods: things the world no longer provides now that hostile
  // mobs are gone. NOT in the level-1 pool — appended after the draw (see
  // postUpdateOffers at the bottom). Supplies, not trophies.
  //
  // Distinct supplies each trader carries. 1 matches the old average (5 draws
  // from 19 with 4 supplies = ~1.05 per trader).
  var SUPPLY_SLOTS = 1;

  const SUPPLIES = [
    // Mob drops with no source left in the pack. All gate storage and
    // automation (Sophisticated upgrades, sticky pistons, cardboard boxes), not
    // combat — so they're consumable components, priced below livestock and with
    // generous uses since players need them in batches.
    // but you really dont need many ghast tears i think one at a time is fine.
    ['minecraft:ender_pearl',   1200, 1800, 4],
    ['minecraft:blaze_rod',     1400, 2000, 4],
    ['minecraft:ghast_tear',    1800, 2600, 1],
  ];

  MoreJS.wandererTrades(event => {
    if (CLEAR_VANILLA) {
      event.removeVanillaTypedTrades();
      event.removeModdedTypedTrades();
    }

    const add = (level, list) => {
      list.forEach(entry => {
        const egg = entry[0];
        const uses = entry[3];
        const reqData = getRequestFromPrice(entry);

        event
          .addTrade(level, [TradeItem.of(reqData.item, reqData.min, reqData.max)], egg)
          .maxUses(uses)
          .priceMultiplier(0);   // no demand-based price drift on a wanderer
      });
    };

    add(1, COMMON_LIVESTOCK);
    add(1, UNCOMMON_LIVESTOCK);
    add(2, RARE_LIVESTOCK);

    console.info('[cowpewter_bap] Registered wanderer livestock trades');
  });

  // Fires once per trader, after vanilla has drawn his level 1 and level 2
  // offers. Appends SUPPLY_SLOTS distinct random supplies.
  // Rhino-safe style: var only, indexed loops, no arrows.
  MoreJS.postUpdateOffers(function (event) {
    if (!event.isWanderer()) return;

    var pool = SUPPLIES.slice();
    var n = Math.min(SUPPLY_SLOTS, pool.length);
    var i, pick, entry, trade, reqData;
    for (i = 0; i < n; i++) {
      pick = Math.floor(Math.random() * pool.length);
      entry = pool.splice(pick, 1)[0];
      reqData = getRequestFromPrice(entry);

      trade = VillagerUtils.createSimpleTrade(
        [TradeItem.of(reqData.item, reqData.min, reqData.max)],
        TradeItem.of(entry[0]));
      trade.maxUses(entry[3]);
      trade.priceMultiplier(0);
      event.addTrade(trade);
    }
  });
})();
