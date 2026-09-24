(function () {
  let SWORDS = [
    'minecraft:wooden_sword',
    'minecraft:stone_sword',
    'minecraft:iron_sword',
    'minecraft:golden_sword',
    'minecraft:diamond_sword',
    'minecraft:netherite_sword',
  ];

  let RANGED = [
    'minecraft:bow',
    'minecraft:crossbow',
    'minecraft:arrow',
  ];

  ServerEvents.recipes(function (event) {
    let i;
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
