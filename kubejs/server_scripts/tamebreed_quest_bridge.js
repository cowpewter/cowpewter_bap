(function () {
  var ELIGIBLE_ENTITIES = [
    'minecraft:cow',
    'minecraft:sheep',
    'minecraft:pig',
    'minecraft:chicken',
  ];

  var TAMING_FOODS = {
    'minecraft:cow': ['minecraft:wheat'],
    'minecraft:sheep': ['minecraft:wheat'],
    'minecraft:pig': ['minecraft:carrot'],
    'minecraft:chicken': [
      'minecraft:wheat_seeds',
      'minecraft:pumpkin_seeds',
      'minecraft:melon_seeds',
      'minecraft:beetroot_seeds',
      'farmersdelight:cabbage_seeds',
      'farmersdelight:tomato_seeds',
    ]
  };

  var ANY_QUEST_TAME = 'questlog:2_01_taming';
  var ANY_QUEST_BREED = 'questlog:2_03_breeding';

  var ENTITY_MULTI_QUESTS = {
    'minecraft:cow': {
      'herdSizeQuest': '',
      'herdSizeQuantity': 20,
      'everOwnedQuest': '',
      'everOwnedQuantity': 50,
    },
    'minecraft:sheep': {
      'herdSizeQuest': '',
      'herdSizeQuantity': 20,
      'everOwnedQuest': '',
      'everOwnedQuantity': 50,
    },
    'minecraft:pig': {
      'herdSizeQuest': '',
      'herdSizeQuantity': 20,
      'everOwnedQuest': '',
      'everOwnedQuantity': 50,
    },
    'minecraft:chicken': {
      'herdSizeQuest': '',
      'herdSizeQuantity': 20,
      'everOwnedQuest': '',
      'everOwnedQuantity': 50,
    }
  };

  function completeQuest(server, questId, username) {
    // Quests in ENTITY_MULTI_QUESTS aren't written yet; skip rather than
    // running a malformed command every time a threshold is crossed.
    if (!questId) return;

    server.runCommandSilent(
      `questlog progress complete ${questId} ${username}`
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
    var questData = ENTITY_MULTI_QUESTS[entityId];

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
    if (!questData) return;
    if (currentHerdSize >= questData.herdSizeQuantity) {
      completeQuest(player.server, questData.herdSizeQuest, player.username);
    }
    if (currentEverOwned >= questData.everOwnedQuantity) {
      completeQuest(player.server, questData.everOwnedQuest, player.username);
    }
  }

  function decrementHerd(player, entityId) {
    var pData = player.persistentData;
    var key = getHerdSizeEntityKey(entityId);

    var currentCount = pData.getInt(key) || 0;
    var newCount = Math.max(0, currentCount - 1);
    pData.setInt(key, newCount);
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

    completeQuest(player.server, ANY_QUEST_TAME, player.username);
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
    completeQuest(owner.server, ANY_QUEST_BREED, owner.username);
    incrementHerd(owner, entityId);
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
