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
  var SUPERIOR_STAT_MIN = 0.95;
  var BEAST_STAT_MIN = 0.99;

  var ADOPT_RADIUS = 2.0;

  // Animal Husbandry's gestation birth spawns the calf straight into the world via
  // addFreshEntityWithPassengers, so BabyEntitySpawnEvent never fires and
  // startup_scripts/breeding_owner.js never stamps it. The dam is standing at the
  // calf's spawn position, so inherit from her.
  function inheritOwnerFromDam(entity, entityType) {
    var genetics = getGenetics(entity);
    if (!genetics || parseInt(genetics.generation || '0') <= 0) {
      // return if generation-0 spawn - that wasn't a bred baby
      return;
    }
    var nearby = entity.level.getEntities(entity, entity.boundingBox.inflate(ADOPT_RADIUS));
    var best = null;
    var bestDist = Infinity;
    for (var i = 0; i < nearby.size(); i++) {
      var other = nearby.get(i);
      if (String(other.type) !== entityType || other.baby) continue;
      if (!getOwnerId(other)) continue;
      var d = other.distanceToSqr(entity);
      if (d < bestDist) { bestDist = d; best = other; }
    }
    if (!best) return;
    var ownerId = getOwnerId(best);
    setOwnerId(entity, ownerId);
  }

  function grantAdvancement(server, adv, username) {
    server.runCommandSilent(
      'advancement grant ' + username + ' only ' + adv
    );
  }

  function getHerdSizeEntityKey(entityType) {
    return `herdSize:${entityType}`;
  }

  function getEverOwnedEntityKey(entityType) {
    return `everOwned:${entityType}`;
  }

  function incrementHerd(player, entity) {
    var pData = player.persistentData;
    var entityType = String(entity.type);

    const isCounted = getIsCounted(entity);
    if (isCounted) return;

    // Current Herd Size
    var herdSizeKey = getHerdSizeEntityKey(entityType);
    var currentHerdSize = pData.getInt(herdSizeKey) || 0;
    currentHerdSize++;
    pData.putInt(herdSizeKey, currentHerdSize);

    // Total Ever everOwned
    var everOwnedKey = getEverOwnedEntityKey(entityType);
    var currentEverOwned = pData.getInt(everOwnedKey) || 0;
    currentEverOwned++;
    pData.putInt(everOwnedKey, currentEverOwned);

    setIsCounted(entity, true);

    // Fire quest completion triggers
    if (currentHerdSize >= HERD_COMPLETE_SIZE) {
      grantAdvancement(player.server, ADV_HERDSIZE, player.username);
    }
    // @todo everOwned - do I even want this as a quest
  }

  function decrementHerd(player, entityType) {
    var pData = player.persistentData;
    var key = getHerdSizeEntityKey(entityType);

    var currentCount = pData.getInt(key) || 0;
    var newCount = Math.max(0, currentCount - 1);
    pData.putInt(key, newCount);
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
  var OWNER_KEY = 'cowpewter_bap:owner';
  var COUNTED_KEY = 'cowpewter_bap:counted';

  function getOwnerId(entity) {
    return String(entity.persistentData.getString(OWNER_KEY) || '');
  }

  function setOwnerId(entity, ownerId) {
    entity.persistentData.putString(OWNER_KEY, ownerId);
  }

  function getIsCounted(entity) {
    return entity.persistentData.getBoolean(COUNTED_KEY) || false;
  }

  function setIsCounted(entity, value) {
    entity.persistentData.putBoolean(COUNTED_KEY, value);
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

    var entityType = String(entity.type);

    // Not tameable
    if (ELIGIBLE_ENTITIES.indexOf(entityType) === -1) {
      return;
    }

    // Already claimed, by this player or anyone else
    if (getOwnerId(entity)) return;

    // Not a taming food
    const eligibleItems = TAMING_FOODS[entityType] || [];
    if (eligibleItems.indexOf(item) === -1) {
      return;
    }

    setOwnerId(entity, String(player.uuid));
    incrementHerd(player, entity);

    grantAdvancement(player.server, ADV_TAME, player.username);
  });

  // Manual food breeding is disabled in this pack; animals breed on their own
  // when happy. The baby is already stamped with its parent's owner by the
  // time it spawns, so an owned baby means the player's herd grew.
  EntityEvents.spawned(event => {
    var entity = event.getEntity();
    if (!entity) return;

    var entityType = String(entity.type);

    // Not an animal we count for this quest
    if (ELIGIBLE_ENTITIES.indexOf(entityType) === -1) {
      return;
    }
    // This is an adult not baby
    if (!entity.baby) return;

    if (!getOwnerId(entity)) {
      inheritOwnerFromDam(entity, entityType);
    }

    // Unowned parents even after inherit check, so nobody gets the credit
    var owner = getOwner(entity);
    if (!owner) return;

    // Fire breed quest and update count
    grantAdvancement(owner.server, ADV_BREED, owner.username);
    // This wont pop by default on AH births. Can fix ParrotsBees but not TwoByTwo without doing a bunch of extra work
    grantAdvancement(owner.server, 'minecraft:husbandry/breed_an_animal', owner.username);
    incrementHerd(owner, entity);

    // Check stats and fire genetics advancements
    var genetics = getGenetics(entity);
    if (!genetics) return;

    var growthRate = parseFloat(genetics.growthRate || '0.0');
    // NB: `yield` is reserved in Rhino -- naming it that fails to parse.
    var producYield = parseFloat(genetics.producYield || '0');
    var fertility = parseFloat(genetics.fertility || '0');
    var constitution = parseFloat(genetics.constitution || '0');
    var generation = parseInt(genetics.generation || '0');
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

    var entityType = String(entity.type);

    // Not an animal we track head count
    if (ELIGIBLE_ENTITIES.indexOf(entityType) === -1) {
      return;
    }

    var owner = getOwner(entity);
    if (!owner) return;

    var counted = getIsCounted(entity);
    if (!counted) return;

    decrementHerd(owner, entityType);
  });
})();
