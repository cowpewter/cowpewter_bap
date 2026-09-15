// While vanilla crops trigger the A Seedy Place advancement, if the player's first crop is modded, this advancement doesn't trigger. And alas, there is no questlog event for planting crops. So we're doing the hard way.
(function () {
  var CROP_TAG = 'minecraft:crops';
  var PLANTING_QUEST = 'questlog:1_02_sprout';

  BlockEvents.placed(function (event) {
      if (!event.player) return;
      if (!event.block.hasTag(CROP_TAG)) return;

      event.server.runCommandSilent(
        'questlog progress complete ' + PLANTING_QUEST + ' ' + event.player.username
      );
  });
})();
