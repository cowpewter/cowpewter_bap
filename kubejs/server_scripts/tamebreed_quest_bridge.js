(function () {
  var ELIGIBLE_ENTITIES = [
    'minecraft:cow',
    'minecraft:sheep',
    'minecraft:pig',
    'minecraft:chicken',
    'minecraft:goat',
  ];

  var TAMING_FOODS = {
    'minecraft:cow': ['minecraft:wheat'],
    'minecraft:sheep': ['minecraft:wheat'],
    'minecraft:pig': ['minecraft:carrot'],
    'minecraft:goat': ['minecraft:wheat'],
    'minecraft:chicken': [
      'minecraft:wheat_seeds',
      'minecraft:pumpkin_seeds',
      'minecraft:melon_seeds',
      'minecraft:beetroot_seeds',
      'farmersdelight:cabbage_seeds',
      'farmersdelight:tomato_seeds',
    ],
  };

  // Granted unconditionally; a questlog:advancement objective decides what (if
  // anything) watches them, so this bridge no longer needs to know quest ids.
  var ADV_TAME = 'cowpewter_bap:quest/tame_animal';
  var ADV_BREED = 'cowpewter_bap:quest/breed_animal';
  var ADV_HERDSIZE = 'cowpewter_bap:quest/herd';
  var ADV_PEDIGREE = 'cowpewter_bap:quest/pedigree';
  var ADV_SUPERIOR = 'cowpewter_bap:quest/superior_genes';
  var ADV_BEAST = 'cowpewter_bap:quest/ultimate_beast';

  var HERD_COMPLETE_SIZE = 25;
  var PEDIGREE_MIN_GENERATION = 10;
  var SUPERIOR_STAT_MIN = 0.9;
  var BEAST_STAT_MIN = 0.95;

  function grantAdvancement(server, adv, username) {
    server.runCommandSilent(
      'advancement grant ' + username + ' only ' + adv
    );
  }

  function getHerdSizeEntityKey(entityId) {
    return `herdSize:${entityId}`;
  }

  function getEverOwnedEntityKey(entityId) {
    return `everOwned:${entityId}`;
  }

  function incrementHerd(player, entityId) {
    var pData = player.persistentData;

    // Current Herd Size
    var herdSizeKey = getHerdSizeEntityKey(entityId);
    var currentHerdSize = pData.getInt(herdSizeKey) || 0;
    currentHerdSize++;
    pData.setInt(herdSizeKey, currentHerdSize);

    // Total Ever everOwned
    var everOwnedKey = getEverOwnedEntityKey(entityId);
    var currentEverOwned = pData.getInt(everOwnedKey) || 0;
    currentEverOwned++;
    pData.setInt(everOwnedKey, currentEverOwned);

    // Fire quest completion triggers
    if (currentHerdSize >= HERD_COMPLETE_SIZE) {
      grantAdvancement(player.server, ADV_HERDSIZE, player.username);
    }
    // @todo everOwned - do I even want this as a quest
  }

  function decrementHerd(player, entityId) {
    var pData = player.persistentData;
    var key = getHerdSizeEntityKey(entityId);

    var currentCount = pData.getInt(key) || 0;
    var newCount = Math.max(0, currentCount - 1);
    pData.setInt(key, newCount);
  }

  function getGenetics(entity) {
    var nbt = null;
    try { nbt = entity.nbt; } catch (e) { return null; }
    if (!nbt) return null;
    var att = nbt['neoforge:attachments'];
    if (!att) return null;
    return att['animalhusbandry:genetics'] || null;
  }

  // Livestock has no vanilla owner, so we stamp one when a player feeds an
  // animal. Babies inherit it in startup_scripts/breeding_owner.js, which must
  // use this same key.
  var OWNER_KEY = 'bapOwner';

  function getOwnerId(entity) {
    return String(entity.persistentData.getString(OWNER_KEY) || '');
  }

  // Null when the owner is offline: their herd counts live in player data, so
  // there is nothing to update until they log back in.
  function getOwner(entity) {
    var ownerId = getOwnerId(entity);
    if (!ownerId) return null;
    return entity.server.getPlayer(ownerId);
  }

  // Feeding an animal claims it. Taming is ours, not vanilla's, so the quest
  // fires here rather than waiting to see a tame flag appear.
  ItemEvents.entityInteracted(event => {
    var entity = event.target;
    var player = event.player;
    // Java strings don't match JS strings with ===, so normalise before any
    // indexOf or key lookup
    var item = event.item && String(event.item.id);

    if (!entity || !player || !item) {
      return;
    }

    var entityId = String(entity.type);

    // Not tameable
    if (ELIGIBLE_ENTITIES.indexOf(entityId) === -1) {
      return;
    }

    // Already claimed, by this player or anyone else
    if (getOwnerId(entity)) return;

    // Not a taming food
    const eligibleItems = TAMING_FOODS[entityId] || [];
    if (eligibleItems.indexOf(item) === -1) {
      return;
    }

    entity.persistentData.putString(OWNER_KEY, String(player.uuid));

    grantAdvancement(player.server, ADV_TAME, player.username);
    incrementHerd(player, entityId);
  });

  // Manual food breeding is disabled in this pack; animals breed on their own
  // when happy. The baby is already stamped with its parent's owner by the
  // time it spawns, so an owned baby means the player's herd grew.
  EntityEvents.spawned(event => {
    var entity = event.getEntity();
    if (!entity) return;

    var entityId = String(entity.type);

    // Not an animal we count for this quest
    if (ELIGIBLE_ENTITIES.indexOf(entityId) === -1) {
      return;
    }
    // This is an adult not baby
    if (!entity.baby) return;

    // Unowned parents, so nobody gets the credit
    var owner = getOwner(entity);
    if (!owner) return;

    // Fire breed quest and update count
    grantAdvancement(owner.server, ADV_BREED, owner.username);
    incrementHerd(owner, entityId);

    // Check stats and fire genetics advancements
    var genetics = getGenetics(entity);
    var growthRate = parseFloat(genetics.growthRate);
    // NB: `yield` is reserved in Rhino -- naming it that fails to parse.
    var producYield = parseFloat(genetics.producYield);
    var fertility = parseFloat(genetics.fertility);
    var constitution = parseFloat(genetics.constitution);
    var generation = parseInt(genetics.generation);
    var statArray = [growthRate, producYield, fertility, constitution];

    if (generation >= PEDIGREE_MIN_GENERATION) {
      grantAdvancement(owner.server, ADV_PEDIGREE, owner.username);
    }

    // One stat above min
    if (statArray.some(stat => stat >= SUPERIOR_STAT_MIN)) {
      grantAdvancement(owner.server, ADV_SUPERIOR, owner.username);
    }

    // All stats above min
    if (statArray.every(stat => stat >= BEAST_STAT_MIN)) {
      grantAdvancement(owner.server, ADV_BEAST, owner.username);
    }
  });

  EntityEvents.death(event => {
    var entity = event.getEntity();
    if (!entity) return;

    var entityId = String(entity.type);

    // Not an animal we track head count
    if (ELIGIBLE_ENTITIES.indexOf(entityId) === -1) {
      return;
    }

    var owner = getOwner(entity);
    if (!owner) return;

    decrementHerd(owner, entityId);
  });
})();
