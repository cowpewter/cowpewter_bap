// A place to remove duped items that have no other home

(function () {
  let ITEMS = [
    'animalhusbandry:fried_egg',
  ];

  // Bye bye recipes
  ServerEvents.recipes(function (event) {
    let i;
    for (i = 0; i < ITEMS.length; i++) {
      event.remove({ output: ITEMS[i] });
    }
  });

  // Chest, archaeology and mob-equipment loot, vanilla and modded alike.
  LootJS.modifiers(function (event) {
    let i;
    for (i = 0; i < ITEMS.length; i++) {
      event.addTableModifier(/.*/).removeLoot(ITEMS[i]);
    }
  });
})();
