// kubejs/client_scripts/asstd_other_dupes.js
// Hides dupe items not covered by other files from JEI. Recipes and loot are removed in
// server_scripts/asstd_other_dupes.js.

RecipeViewerEvents.removeEntries('item', function (event) {
  event.remove('animalhusbandry:fried_egg');
});
