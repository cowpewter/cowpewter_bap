(function () {
  const STARTING_ITEMS_STAGE = 'starting_items';
  const STARTING_ITEMS = [
    'cowpewter_bap:guide_book',
    '8x minecraft:bread',
  ];

  PlayerEvents.loggedIn(event => {
    const player = event.player;
    if (!player) return;
    if (!player.stages.has(STARTING_ITEMS_STAGE)) {
      player.stages.add(STARTING_ITEMS_STAGE);
      STARTING_ITEMS.forEach(i => player.give(i));
    }
  });
})();
