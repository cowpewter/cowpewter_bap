// Default gamerules for Normal difficulty with no combat
// Spawn control itself is handled by In Control!. The rules below cover the
// things In Control! CANNOT catch, plus general pack defaults.
//
// Applies ONCE per world by default so players can adjust afterward.
// Set ALWAYS_APPLY to true to enforce the pack's values on every load.

(function () {
  let ALWAYS_APPLY = false;

  let GAMERULES = {
    // --- Spawns that bypass normal spawn logic (In Control! won't catch these) ---
    doWardenSpawning: false,    // Wardens emerge from sculk shriekers, not spawn
    // attempts. Deep Dark / ancient cities. IMPORTANT.
    doInsomnia: false,          // phantoms, triggered by sleep timer
    doPatrolSpawning: false,    // pillager patrols (overworld)
    doTraderSpawning: true,     // wandering traders, keep true for bonus traders beyond bell summons
    disableRaids: true,         // raids, triggered by Bad Omen

    // --- Hunger loop: keep intact, this is the point of Normal difficulty ---
    naturalRegeneration: true,  // regen costs hunger. Do not disable.

    // --- Quality of life ---
    keepInventory: false,
    playersSleepingPercentage: 0,   // one player can skip night
    announceAdvancements: true,
    showDeathMessages: true,
    forgiveDeadPlayers: true,
    universalAnger: false,

    // --- World behavior ---
    mobGriefing: true,          // set false to also stop wither/dragon block damage
    doFireTick: true,
    randomTickSpeed: 3,         // affects crop growth; raise cautiously
  };

  ServerEvents.loaded(function (event) {
    let server = event.server;
    let data = server.persistentData;

    if (!ALWAYS_APPLY && data.getBoolean('packGamerulesApplied')) {
      return;
    }

    let count = 0;
    let rule;
    for (rule in GAMERULES) {
      server.runCommandSilent('gamerule ' + rule + ' ' + GAMERULES[rule]);
      count++;
    }

    data.putBoolean('packGamerulesApplied', true);
    console.info('[cowpewter_bap] Applied ' + count + ' default gamerules');
  });
})();

