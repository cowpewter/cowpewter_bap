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
// Rhino-safe style: var only, indexed loops, no arrows.

(function () {
  var SWORDS = [
    'minecraft:wooden_sword',
    'minecraft:stone_sword',
    'minecraft:iron_sword',
    'minecraft:golden_sword',
    'minecraft:diamond_sword',
    'minecraft:netherite_sword'
  ]

  ServerEvents.recipes(function (event) {
    var i
    for (i = 0; i < SWORDS.length; i++) {
      event.remove({ output: SWORDS[i] })
    }

    // The only recipe in the pack that consumes a sword.
    event.replaceInput(
      { id: 'sophisticatedbackpacks:tool_swapper_upgrade' },
      'minecraft:wooden_sword',
      '#c:tools/knife'
    )

    console.info('[cowpewter_bap] removed ' + SWORDS.length +
                ' sword recipes; tool swapper takes a knife')
  })

  // Chest, archaeology and mob-equipment loot, vanilla and modded alike.
  LootJS.modifiers(function (event) {
    event.addTableModifier(/.*/).removeLoot('#minecraft:swords')
    console.info('[cowpewter_bap] swords removed from all loot tables')
  })
})();
