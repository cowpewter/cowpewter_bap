// removes swords and other weapons from JEI

(function () {
  RecipeViewerEvents.removeEntries('item', function (event) {
    event.remove('#minecraft:swords');
    event.remove('#minecraft:arrows');
    event.remove('minecraft:bow');
    event.remove('minecraft:crossbow');
  });
})();
