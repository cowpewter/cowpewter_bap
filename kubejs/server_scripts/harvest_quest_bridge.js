(function () {
  const CROP_TAG = 'minecraft:crops';
  const HARVEST_QUEST = 'questlog:1_03_harvester';

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
    'farmersdelight:rice_panicles',
  ];

  const pendingHarvest = {};

  function completeQuest(server, username) {
    server.runCommandSilent(
      `questlog progress complete ${HARVEST_QUEST} ${username}`
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
    pendingHarvest[event.player.username] = {
      expires: event.server.tickCount + 10,
      items: items
    };
  });

  PlayerEvents.inventoryChanged(event => {
    if (!event.player || !event.item) return;

    const username = event.player.username;
    const pending = pendingHarvest[username];

    if (!pending) return;

    if (event.player.server.tickCount > pending.expires) {
      delete pendingHarvest[username];
      return;
    }

    if (!pending.items.includes(event.item.id)) return;

    delete pendingHarvest[username];

    completeQuest(event.player.server, username);
  });
})();
