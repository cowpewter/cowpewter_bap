(function () {
  const AfterHarvestEvent =
    Java.loadClass('io.github.jamalam360.rightclickharvest.neoforge.RightClickHarvestNeoForgeEvents$AfterHarvest');

  const HARVEST_ADVANCEMENT = 'cowpewter_bap:quest/harvest_crop';

  const VALID_HARVEST_BLOCKS = [
    'minecraft:wheat',
    'minecraft:carrots',
    'minecraft:potatoes',
    'minecraft:beetroots',
    'farmersdelight:rice',
    'farmersdelight:rice_panicles',
    'farmersdelight:tomatoes',
  ];

  function grantHarvested(server, username) {
    server.runCommandSilent(
      `advancement grant ${username} only ${HARVEST_ADVANCEMENT}`
    );
  }

  NativeEvents.onEvent(AfterHarvestEvent, (event) => {
    const player = event.context.player();
    const block = event.context.block();
    if (!player || !block) return;

    if (VALID_HARVEST_BLOCKS.indexOf(block.id) === -1) {
      return;
    }
    grantHarvested(player.server, player.username);
  });
})();
