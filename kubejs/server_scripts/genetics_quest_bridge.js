// kubejs/server_scripts/genetics_quest_bridge.js
//
// Questlog can't read entity NBT, so "raise a high-yield animal" isn't
// expressible as an objective. This bridges it: the quest uses
// `questlog:unobtainable`, and this completes it via command.
//
// Also doubles as a readout — inspecting an animal reports its genetics.
//
// Genetics live in a NeoForge data attachment:
//   nbt["neoforge:attachments"]["animalhusbandry:genetics"]
//     producYield, constitution, fertility, growthRate  -> float 0.0-1.0
//     generation                                        -> int
//     trait, pattern, primaryColor, isMale
//
// Rhino-safe style: var only, indexed loops, no arrows or destructuring.

(function () {
  // Item that triggers an inspection. Empty string = any item.
  var INSPECT_ITEM = 'animalhusbandry:magnifying_glass';

  var YIELD_QUEST = 'questlog:06_prize_animal';
  var YIELD_THRESHOLD = 0.85;   // producYield counting as "exceptional" (0.0-1.0)

  var GEN_QUEST = 'questlog:07_generations';
  var GEN_THRESHOLD = 5;        // generation counter

  // This is what the ledger is for
  // Only used for debugging
  var SHOW_STATS = false;        // report genetics in chat on inspect

  var TRACKED = [
    'minecraft:cow', 'minecraft:sheep', 'minecraft:pig', 'minecraft:chicken',
    'minecraft:goat', 'minecraft:rabbit'
  ];

  function getGenetics(entity) {
    var nbt = null;
    try { nbt = entity.nbt; } catch (e) { return null; }
    if (!nbt) return null;
    var att = nbt['neoforge:attachments'];
    if (!att) return null;
    return att['animalhusbandry:genetics'] || null;
  }

  function getCare(entity) {
    var nbt = null;
    try { nbt = entity.nbt; } catch (e) { return null; }
    if (!nbt) return null;
    var att = nbt['neoforge:attachments'];
    if (!att) return null;
    return att['animalhusbandry:care_data'] || null;
  }

  function pct(v) {
    return Math.round(parseFloat(v) * 100) + '%';
  }

  ItemEvents.entityInteracted(function (event) {
    var target = event.target;
    var player = event.player;
    if (!target || !player) return;

    if (TRACKED.indexOf(String(target.type)) < 0) return;
    if (INSPECT_ITEM !== '' && String(event.item.id) !== INSPECT_ITEM) return;

    var g = getGenetics(target);
    if (!g) return;

    var yieldVal = parseFloat(g.producYield);

    if (SHOW_STATS) {
      var care = getCare(target);
      player.tell('§6— ' + String(target.type).replace('minecraft:', '') +
                  ' · gen ' + g.generation + ' —');
      player.tell('§7yield §f' + pct(g.producYield) +
                  ' §7fert §f' + pct(g.fertility) +
                  ' §7growth §f' + pct(g.growthRate) +
                  ' §7const §f' + pct(g.constitution));
      player.tell('§7' + g.primaryColor + ' ' + g.pattern +
                  ' · trait §f' + g.trait +
                  (care ? ' §7· happiness §f' + care.Happiness : ''));
    }

    if (yieldVal >= YIELD_THRESHOLD) {
      event.server.runCommandSilent(
        'questlog progress complete ' + YIELD_QUEST + ' ' + player.username);
      // eslint-disable-next-line no-console
      console.info('[cowpewter_bap] ' + player.username +
                  ' qualified for yield — producYield ' + yieldVal);
    }

    if (parseInt(g.generation) >= GEN_THRESHOLD) {
      event.server.runCommandSilent(
        'questlog progress complete ' + GEN_QUEST + ' ' + player.username);
      // eslint-disable-next-line no-console
      console.info('[cowpewter_bap] ' + player.username +
                  ' qualified for bloodline — generation ' + g.generation);
    }
  });
})();
