(function () {
  ServerEvents.recipes(event => {
    // Feeding trough - any logs
    event.replaceInput(
      { output: 'animalhusbandry:feeding_trough'},
      'minecraft:oak_log',
      '#minecraft:logs'
    );

    // Fertility potion in Farmer's Delight pot
    event.recipes.farmersdelight.cooking(
      'misc',
      ['animalhusbandry:truffle', 'minecraft:wheat', 'minecraft:egg'],
      'animalhusbandry:fertility_potion',
      2,
      200,
      'minecraft:glass_bottle'
    );
  });
})();
