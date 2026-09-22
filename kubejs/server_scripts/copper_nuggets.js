(function () {
  var RECIPE_IDS = [
    'minecraft:name_tag',
    'minecraft:lantern',
    'minecraft:soul_lantern',
  ];

  ServerEvents.recipes(event => {
    var i;
    for (i = 0; i < RECIPE_IDS.length; i++) {
      event.replaceInput(
        { output: RECIPE_IDS[i] },
        'minecraft:iron_nugget',
        '#cowpewter_bap:util_nuggets'
      );
    }
    console.info('[cowpewter_bap] copper nuggets recipes registered');
  });
})();
