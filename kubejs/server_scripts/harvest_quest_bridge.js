(function () {
  const CROP_TAG = 'minecraft:crops';
  const HARVEST_ADVANCEMENT = 'cowpewter_bap:quest/harvest_crop';

  const HARVEST_ITEMS = {
    'minecraft:wheat': ['minecraft:wheat'],
    'minecraft:carrots': ['minecraft:carrot'],
    'minecraft:potatoes': ['minecraft:potato'],
    'minecraft:beetroots': ['minecraft:beetroot'],
    'farmersdelight:rice': ['farmersdelight:rice_panicle'],
    'farmersdelight:rice_panicles': ['farmersdelight:rice_panicle'],
    'farmersdelight:tomatoes': ['farmersdelight:tomato']
  };

  const NON_CROP_TAGGED = [
    'farmersdelight:tomatoes',
    'farmersdelight:rice',
  ];

  const pendingHarvest = {};

  function grantHarvested(server, username) {
    server.runCommandSilent(
      `advancement grant ${username} only ${HARVEST_ADVANCEMENT}`
    );
  }

  function isCandidateCrop(block) {
    return block &&
            (
              NON_CROP_TAGGED.indexOf(block.id) !== -1  ||
                block.hasTag(CROP_TAG)
            );
  }

  BlockEvents.rightClicked(event => {
    if (event.level.isClientSide()) return;
    if (!event.player || !event.block) return;
    if (!isCandidateCrop(event.block)) return;

    const id = event.block.id;
    const items = HARVEST_ITEMS[id];

    if (!items) return;

    // Record every click, including bone-meal clicks.
    pendingHarvest[event.player.uuid] = {
      expires: event.server.tickCount + 10,
      items: items
    };
  });

  PlayerEvents.inventoryChanged(event => {
    if (!event.player || !event.item) return;

    const uuid = event.player.uuid;
    const pending = pendingHarvest[uuid];

    if (!pending) return;

    if (event.player.server.tickCount > pending.expires) {
      delete pendingHarvest[uuid];
      return;
    }

    if (!pending.items.includes(event.item.id)) return;

    delete pendingHarvest[uuid];

    grantHarvested(event.player.server, username);
  });
})();
