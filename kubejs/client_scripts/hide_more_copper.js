// see server_scripts/copper_cleanup.js for other side
(function () {
  var MOD_ID = 'more_useful_copper';
  var COPPER_VARIANTS = [
    '',
    'exposed_',
    'oxidized_',
    'weathered_',
    'waxed_',
    'waxed_exposed_',
    'waxed_oxidized_',
    'waxed_weathered_',
  ];

  // NOTE: <variant>copper_wall_redstone_torch is block-only, it has no item
  // form. It gets placed by the standing torch item, so removing that covers
  // it. Listing it here just makes the ingredient parse blow up.
  var COPPER_ITEMS = [
    'copper_button',
    'copper_comparator',
    'copper_lever',
    'copper_pressure_plate',
    'copper_redstone_dust',
    'copper_redstone_torch',
    'copper_repeater',
  ];

  var INDIVIDUAL_IDS = [
    `${MOD_ID}:copper_bottom_boat`,
    `${MOD_ID}:copper_golem_spawn_egg`,
    `${MOD_ID}:copper_sword`, // NO SWORDS
    `${MOD_ID}:garden_stake`,
    `${MOD_ID}:lightning_bottle`,
    `${MOD_ID}:moisture_compass`,
    `${MOD_ID}:sparkstone_relay`,
    `${MOD_ID}:sparkstone_torch`,
    // sparkstone_wall_torch is block-only too, same deal as above
  ];

  var VARIANT_IDS = [];
  COPPER_VARIANTS.forEach(variant => {
    COPPER_ITEMS.forEach(item => {
      VARIANT_IDS.push(`${MOD_ID}:${variant}${item}`);
    });
  });

  var ALL_IDS = VARIANT_IDS.concat(INDIVIDUAL_IDS);

  // Remove it all from JEI
  RecipeViewerEvents.removeEntries('item', event => {
    ALL_IDS.forEach(id => {
      event.remove(id);
    });
  });
})();
