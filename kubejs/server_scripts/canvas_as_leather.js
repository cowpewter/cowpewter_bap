// kubejs/server_scripts/canvas_as_leather.js

(function () {
  var MODS = [
    'sophisticatedbackpacks',
    'sophisticatedstorage',
    'sophisticatedcore'
  ]

  // Individual storage recipes outside those mods. Matched by recipe ID, since
  // Vanilla Backport registers its bundle as minecraft:bundle (a mod filter on
  // 'vanillabackport' would miss it). Vanilla leather armor stays leather-only.
  var RECIPE_IDS = [
    'minecraft:bundle'
  ]

  ServerEvents.tags('item', event => {
    // covers every recipe already using the convention tag
    event.add('c:leathers', 'farmersdelight:canvas')
  })

  ServerEvents.recipes(event => {
    // covers the stragglers that hardcode the item
    var i
    for (i = 0; i < MODS.length; i++) {
      event.replaceInput(
        { mod: MODS[i] },
        'minecraft:leather',
        '#c:leathers'
      )
    }
    for (i = 0; i < RECIPE_IDS.length; i++) {
      event.replaceInput(
        { id: RECIPE_IDS[i] },
        'minecraft:leather',
        '#c:leathers'
      )
    }
    console.info('[cowpewter_bap] canvas added to c:leathers; leather swapped in: ' +
      MODS.join(', ') + ', ' + RECIPE_IDS.join(', '))
  });
})();
