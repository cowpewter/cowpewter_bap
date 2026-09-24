const BAP_POUCH = (function () {
  const CuriosApi = Java.loadClass('top.theillusivec4.curios.api.CuriosApi');
  const SimpleContainer = Java.loadClass('net.minecraft.world.SimpleContainer');
  const DataComponents = Java.loadClass('net.minecraft.core.component.DataComponents');
  const ItemContainerContents = Java.loadClass('net.minecraft.world.item.component.ItemContainerContents');
  const ItemStack = Java.loadClass('net.minecraft.world.item.ItemStack');

  const POUCH_SLOTS = 27;
  const COIN_IDS = [
    'cowpewter_bap:coin_1',
    'cowpewter_bap:coin_10',
    'cowpewter_bap:coin_100',
    'cowpewter_bap:coin_500',
  ];
  const COIN_LADDER = [
    { from: 'cowpewter_bap:coin_1',   to: 'cowpewter_bap:coin_10',  ratio: 10 },
    { from: 'cowpewter_bap:coin_10',  to: 'cowpewter_bap:coin_100', ratio: 10 },
    { from: 'cowpewter_bap:coin_100', to: 'cowpewter_bap:coin_500', ratio: 5 },
  ];
  // Coins stack to 64, see economy.js
  const MAX_COIN_STACK = 64;

  // Make coins tag
  ServerEvents.tags('item', event => {
    COIN_IDS.forEach(id => {
      event.add('cowpewter_bap:coins', id);
    });
  });

  // Make coin breakdown recipes
  ServerEvents.recipes(event => {
    event.shapeless(Item.of('cowpewter_bap:coin_1', 10), ['cowpewter_bap:coin_10']);
    event.shapeless(Item.of('cowpewter_bap:coin_10', 10), ['cowpewter_bap:coin_100']);
    event.shapeless(Item.of('cowpewter_bap:coin_100', 5), ['cowpewter_bap:coin_500']);
  });

  // Ensure player has coin pouch in curio slot on login
  PlayerEvents.loggedIn(event => {
    const player = event.player;
    if (!player) return;
    const stackData = getPouchSlotStack(player, true);
    if (!stackData.stack && stackData.curios) {
      stackData.curios.setEquippedCurio('coin_pouch', 0, Item.of('cowpewter_bap:coin_pouch'));
    }
    // Cleanup in case player disco'd
    delete OPEN_POUCHES[player.uuid];
  });

  PlayerEvents.loggedOut(event => {
    const player = event.player;
    if (!player) return;
    // Cleanup in case player disco'd
    delete OPEN_POUCHES[player.uuid];
  });

  // Open GUI on keybind
  NetworkEvents.dataReceived('cowpewter_bap:open_pouch', event => {
    const player = event.player;
    if (!player) return;
    const pouch = getPouchSlotStack(player);
    if (!pouch.stack) return;

    openPouch(player, pouch.stack);
  });

  // Close GUI on death
  EntityEvents.death('minecraft:player', event => {
    const player = event.entity;
    if (!player) return;

    player.closeContainer();
  });

  const getDenominationCount = (container, denomId) => {
    let numSlots = container.getContainerSize();
    let count = 0;
    for (let i = 0; i < numSlots; i++) {
      let stack = container.getItem(i);
      if (String(stack.id) === denomId) {
        count += stack.count;
      }
    }
    return count;
  };

  const condenseContainer = (container) => {
    let count, batches, added;
    let converted = false;
    COIN_LADDER.forEach(rung => {
      count = getDenominationCount(container, rung.from);
      batches = Math.floor(count / rung.ratio);
      if (batches <= 0) return;

      let left = batches;
      added = 0;
      while (left > 0) {
        let chunk = Math.min(left, MAX_COIN_STACK);
        let remainder = container.addItem(Item.of(rung.to, chunk));
        let accepted = chunk - remainder.count;
        added += accepted;
        if (accepted < chunk) break;   // pouch is full, stop trying
        left -= chunk;
      }
      if (added <= 0) return;
      removeDenomination(container, rung.from, added * rung.ratio);
      converted = true;
    });

    // Only worth tidying if something actually moved
    if (converted) compactContainer(container);
  };

  // Condensing leaves coins scattered over part-full stacks, so pull each
  // denomination out and put it back as whole stacks. Cosmetic only.
  const compactContainer = (container) => {
    COIN_IDS.forEach(id => {
      let total = getDenominationCount(container, id);
      if (total <= 0) return;

      removeDenomination(container, id, total);

      let left = total;
      while (left > 0) {
        let chunk = Math.min(left, MAX_COIN_STACK);
        let remainder = container.addItem(Item.of(id, chunk));
        if (!remainder.isEmpty()) {
          // Can't happen: we just freed at least this much room
          console.log('[cowpewter_bap] compaction lost ' + remainder.count + ' ' + id);
          return;
        }
        left -= chunk;
      }
    });
  };

  const removeDenomination = (container, denomId, amount) => {
    let numSlots = container.getContainerSize();
    let left = amount;
    let stack, removed;
    for (let i = 0; i < numSlots; i++) {
      stack = container.getItem(i);
      if (String(stack.id) === denomId) {
        removed = container.removeItem(i, Math.min(left, stack.count));
        left -= removed.count;
        if (left == 0) {
          break;
        }
      }
    }
    return amount - left;
  };

  // Pick up coins automagically
  const coinPickupHandler = (event) => {
    // Dont pick up so fast it doesn't hit the ground
    if (event.itemEntity.hasPickUpDelay()) return;

    const player = event.player;
    if (!player) return;

    // Player has the Coin Pouch GUI open, add to bag
    const currentPouch = OPEN_POUCHES[player.uuid] || null;
    if (currentPouch) {
      addToContainer(event, currentPouch);
      return;
    }

    const pouchStack = getPouchSlotStack(player);
    if (!pouchStack.stack) return; // no pouch allow default pickup

    const container = getLinkedContainerFromPouch(player, pouchStack.stack);
    addToContainer(event, container);
  };

  COIN_IDS.forEach(id => {
    ItemEvents.canPickUp(id, coinPickupHandler);
  });

  const addToContainer = (event, container) => {
    const origCount = event.item.getCount();
    let remainders = container.addItem(event.item);
    let remainderCnt = remainders.getCount();
    let numInserted = origCount - remainderCnt;

    // Nothing inserted, bag full, fallback to vanilla pickup
    if (!numInserted) {
      // Condense and try again
      condenseContainer(container);
      remainders = container.addItem(event.item);
      remainderCnt = remainders.getCount();
      numInserted = origCount - remainderCnt;
      if (!numInserted) {
        // Bag still full
        return;
      }
    }

    // Post-add condense - do before event.cancel because it throws
    condenseContainer(container);

    if (remainders.isEmpty()) {
      // All inserted
      event.itemEntity.discard();
      event.cancel();
    } else {
      // Some inserted
      event.itemEntity.setItem(remainders);
      event.cancel();
    }
  };

  const getPouchSlotStack = (player, debug = false) => {
    const curiosInv = CuriosApi.getCuriosInventory(player);
    if (!curiosInv.isPresent()) {
      console.log('[cowpewter_bap] no curios found');
      return { stack: null, curios: null };
    }
    const curios = curiosInv.get();
    const slotHandler = curios.getStacksHandler('coin_pouch');
    if (!slotHandler.isPresent()) {
      console.log('[cowpewter_bap] no pouch slot found');
      return { stack: null, curios: curios };
    }
    const slot = slotHandler.get();
    const stack = slot.getStacks().getStackInSlot(0);
    if (stack.isEmpty()) {
      if (debug) {
        console.info('[cowpewter_bap] no pouch found in slot');
      }
      return { stack: null, curios: curios };
    }

    return {
      stack: stack,
      curios: curios
    };
  };

  const getLinkedContainerFromPouch = (player, pouch) => {
    // Need to create an array of POUCH_SLOTS ItemStack.EMPTY
    // As subclassing SimpleContainer means we can't use the int constructor
    const tempArr = [];
    for (let i = 0; i < POUCH_SLOTS; i++) {
      tempArr.push(ItemStack.EMPTY);
    }

    // Create new inv that can only hold coins
    const tempInv = new JavaAdapter(
      SimpleContainer,
      { canPlaceItem: (_, stack) => COIN_IDS.indexOf(String(stack.id)) != -1 },
      tempArr
    );
    const pouchContent = pouch.get(DataComponents.CONTAINER);
    // If pouch has never had an item, pouchContent is null
    if (pouchContent) {
      pouchContent.copyInto(tempInv.getItems());
    }

    tempInv.addListener(() => {
      if (pouch.isEmpty()) {
        player.closeContainer();
        console.log('[cowpewter_bap] pouch moved');
        return;
      }
      // When the inv contents change, copy content back to pouch
      const newContent = ItemContainerContents.fromItems(tempInv.getItems());
      pouch.set(DataComponents.CONTAINER, newContent);
    });

    return tempInv;
  };

  // Store open pouch GUIs for pickup
  const OPEN_POUCHES = {};

  const openPouch = (player, pouch) => {
    if (!player || !pouch) return;

    const tempInv = getLinkedContainerFromPouch(player, pouch);
    OPEN_POUCHES[player.uuid] = tempInv;
    player.openInventoryGUI(tempInv, Text.of('Coin Pouch'));
  };

  PlayerEvents.inventoryClosed('kubejs:menu', event => {
    if (!event.player) return;
    const container = OPEN_POUCHES[event.player.uuid];
    if (container) {
      condenseContainer(container);
    }
    delete OPEN_POUCHES[event.player.uuid];
  });

  // useful other places
  return {
    COIN_IDS: COIN_IDS,
    getPouchSlotStack: getPouchSlotStack,
    condenseContainer: condenseContainer,
    getLinkedContainerFromPouch: getLinkedContainerFromPouch,
  };
})();
