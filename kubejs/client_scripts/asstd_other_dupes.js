// Hides dupe items not covered by other files from JEI.
// See also server_scripts/asstd_other_dupes.js.

(function () {
  RecipeViewerEvents.removeEntries('item', function (event) {
    event.remove('animalhusbandry:fried_egg');
  });
})();
