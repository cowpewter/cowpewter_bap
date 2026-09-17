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
  var ANY_QUEST_BREED = 'questlog:2_02_breeding';

  var ENTITY_MULTI_QUESTS = {
    'minecraft:cow': {
      'herdSizeQuest': 'questlog:',
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
    pData.setInt(key, currentEverOwned);

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

  var pendingInteraction = {};

  ItemEvents.entityInteracted(event => {
    var entity = event.target;
    var player = event.player;
    var item = event.item && event.item.id;

    if (!entity || !player || !item) {
      return;
    }

    // Not tameable
    if (ELIGIBLE_ENTITIES.indexOf(entity.id) === -1) {
      return;
    }

    // this animal is already tamed
    if (entity.owner) return;

    // Not a taming food
    const eligibleItems = TAMING_FOODS[entity.id] || [];
    if (eligibleItems.indexOf(item) === -1) {
      return;
    }

    pendingInteraction[event.player.username] = {
      expires: event.server.tick + 10,
      entity: entity,
    };

    server.scheduleInTicks(10, () => {
      // Paranoia in case of logouts
      if (!player || !entity) {
        return;
      }
      // Check if we own it now
      if (entity.owner && entity.owner.username === player.username) {
        // Fire tame quest
        completeQuest(player.server, ANY_QUEST_TAME, player.username);
        delete pendingInteraction[player.username];
      }
    });
  });

  // Manual food breeding is disabled in this pack
  // Animals will breed on their own if they are happy
  // So just check the owner on any new baby animals
  EntityEvents.spawned(event => {
    var entity = event.getEntity();
    if (!entity) return;

    // No owner, natural spawn, not bred
    if (!entity.owner) return;

    // This is an adult not baby
    if (entity.properties.age >= 0) return;

    // Not an animal we count for this quest
    if (ELIGIBLE_ENTITIES.indexOf(entity.id) === -1) {
      return;
    }

    // Fire breed quest and update count
    completeQuest(owner.server, ANY_QUEST_BREED, owner.username);
    incrementHerd(owner, entity.id);
  });

  EntityEvents.death(event => {
    var entity = event.getEntity();
    // No owner, dont care
    if (!entity.owner) return;

    // Not an animal we track head count
    if (ELIGIBLE_ENTITIES.indexOf(entity.id) === -1) {
      return;
    }

    decrementHerd(owner, entity.id);
  });
})();
