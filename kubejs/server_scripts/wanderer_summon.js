(function () {
  // Summon the Wandering Trader by ringing a bell
  // Has a cooldown so you can't just summon until you get what you want

  const DAY_IN_TICKS = 24000;
  const COOLDOWN_DAYS = 1; // how often can you summon
  const COOLDOWN_KEY = 'trader_cooldown'; // persistent data key
  const MIN_SUMMON_DELAY = 100; // Takes at least n ticks to appear
  const MAX_SUMMON_DELAY = 200; // Takes at most n ticks to appear

  // For testing:
  // /kubejs persistent-data entity @s remove trader_cooldown

  const canSummonNow = (player) => {
    var pData = player.persistentData;
    var lastSummonTime = pData.getLong(COOLDOWN_KEY) || 0;
    var now = player.level.time;
    return !lastSummonTime || now - lastSummonTime > COOLDOWN_DAYS * DAY_IN_TICKS;
  };

  // pos is a BlockPos
  const doSummon = (server, level, pos) => {
    const delay = Math.floor(Math.random() * 
      (MAX_SUMMON_DELAY - MIN_SUMMON_DELAY)) + MIN_SUMMON_DELAY;

    server.scheduleInTicks(delay, () => {
      var trader = level.createEntity('minecraft:wandering_trader');
      trader.setPos(pos.above());
      trader.spawn();
    });
  };

  BlockEvents.rightClicked('more_useful_copper:copper_bell', event => {
    const player = event.player;
    if (!player) return;

    if (canSummonNow(player)) {
      doSummon(player.server, player.level, event.block.pos);
      player.persistentData.putLong(COOLDOWN_KEY, player.level.time);
    } else {
      player.setStatusMessage(Text.of('The Trader is too far away to hear you.'));
    }
  });
})();
