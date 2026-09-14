// kubejs/server_scripts/canvas_as_leather.js

var MODS = [
  'sophisticatedbackpacks',
  'sophisticatedstorage',
  'sophisticatedcore'
]

ServerEvents.tags('item', function (event) {
  // covers every recipe already using the convention tag
  event.add('c:leathers', 'farmersdelight:canvas')
})

ServerEvents.recipes(function (event) {
  // covers the stragglers that hardcode the item
  var i
  for (i = 0; i < MODS.length; i++) {
    event.replaceInput(
      { mod: MODS[i] },
      'minecraft:leather',
      '#c:leathers'
    )
  }
  console.info('[cowpewter_bap] canvas added to c:leathers; leather swapped in: ' +
               MODS.join(', '))
})
