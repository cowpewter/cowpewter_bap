// kubejs/server_scripts/no_swords.js
//
// No combat, so swords have no job. Axes cull livestock, and the Farmer's
// Delight knife covers the sword's one farm use — cobweb -> string. Knives
// are DiggerItems with cobweb in farmersdelight:mineable/knife, so they
// already count as the correct tool and the vanilla loot table drops string.
//
// The sword items still exist (they can't be unregistered); this removes
// every way to get one. JEI hiding is in client_scripts/hide_swords.js.
//
// Now removes all ranged weapons too
//
// Rhino-safe style: var only, indexed loops, no arrows.

(function () {
  var SWORDS = [
    'minecraft:wooden_sword',
    'minecraft:stone_sword',
    'minecraft:iron_sword',
    'minecraft:golden_sword',
    'minecraft:diamond_sword',
    'minecraft:netherite_sword',
  ];

  var RANGED = [
    'minecraft:bow',
    'minecraft:crossbow',
    'minecraft:arrow',
  ];

  ServerEvents.recipes(function (event) {
    var i;
    for (i = 0; i < SWORDS.length; i++) {
      event.remove({ output: SWORDS[i] });
    }
    for (i = 0; i < RANGED.length; i++) {
      event.remove({ output: RANGED[i] });
    }

    // The only recipe in the pack that consumes a sword.
    event.replaceInput(
      { id: 'sophisticatedbackpacks:tool_swapper_upgrade' },
      'minecraft:wooden_sword',
      '#c:tools/knife'
    );

    console.info('[cowpewter_bap] removed ' + (SWORDS.length + RANGED.length) +
                ' weapon recipes; tool swapper takes a knife');
  });

  // Chest, archaeology and mob-equipment loot, vanilla and modded alike.
  LootJS.modifiers(function (event) {
    event.addTableModifier(/.*/).removeLoot('#minecraft:swords');
    event.addTableModifier(/.*/).removeLoot('#minecraft:arrows');
    event.addTableModifier(/.*/).removeLoot('minecraft:bow');
    event.addTableModifier(/.*/).removeLoot('minecraft:crossbow');
    console.info('[cowpewter_bap] weapons removed from all loot tables');
  });
})();
