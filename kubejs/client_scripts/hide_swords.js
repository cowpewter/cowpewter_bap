// kubejs/client_scripts/hide_swords.js
// Hides swords from JEI. Recipes and loot are removed in
// server_scripts/no_swords.js.

RecipeViewerEvents.removeEntries('item', function (event) {
  event.remove('#minecraft:swords')
})
