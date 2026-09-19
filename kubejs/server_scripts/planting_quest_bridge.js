// While vanilla crops trigger the A Seedy Place advancement, if the player's first crop is modded, this advancement doesn't trigger. And alas, there is no questlog event for planting crops. So we grant our own advancement, which a questlog:advancement objective watches -- that way the bridge doesn't need to know which quest (if any) cares.
(function () {
  var CROP_TAG = 'minecraft:crops';
  var PLANTING_ADVANCEMENT = 'cowpewter_bap:quest/plant_crop';

  BlockEvents.placed(function (event) {
    if (!event.player) return;
    if (!event.block.hasTag(CROP_TAG)) return;

    event.server.runCommandSilent(
      'advancement grant ' + event.player.username + ' only ' + PLANTING_ADVANCEMENT
    );
  });
})();
