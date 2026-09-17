(function () {
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

  // Make coins tag
  ServerEvents.tags('item', event => {
    COIN_IDS.forEach(id => {
      event.add('cowpewter_bap:coins', id);
    });
  });

  // Ensure player has coin pouch in curio slot on login
  PlayerEvents.loggedIn(event => {
    const player = event.player;
    if (!player) return;
    const stackData = getPouchStack(player);
    if (!stackData.stack && stackData.curios) {
      stackData.curios.setEquippedCurio('coin_pouch', 0, Item.of('cowpewter_bap:coin_pouch'));
    }
    // Cleanup in case player disco'd
    delete OPEN_POUCHES[player.username];
  });

  PlayerEvents.loggedOut(event => {
    const player = event.player;
    if (!player) return;
    // Cleanup in case player disco'd
    delete OPEN_POUCHES[player.username];
  });

  // Open GUI on keybind
  NetworkEvents.dataReceived('cowpewter_bap:open_pouch', event => {
    const player = event.player;
    if (!player) return;
    const pouch = getPouchStack(player);
    if (!pouch.stack) return;

    openPouch(player, pouch.stack);
  });

  // Close GUI on death
  EntityEvents.death('minecraft:player', event => {
    const player = event.entity;
    if (!player) return;

    player.closeContainer();
  });

  // Pick up coins automagically
  const coinPickupHandler = (event) => {
    // Dont pick up so fast it doesn't hit the ground
    if (event.itemEntity.hasPickUpDelay()) return;

    const player = event.player;
    if (!player) return;

    // Player has the Coin Pouch GUI open, add to bag
    const currentPouch = OPEN_POUCHES[player.username] || null;
    if (currentPouch) {
      addToContainer(event, currentPouch);
      return;
    }

    const pouchStack = getPouchStack(player);
    if (!pouchStack.stack) return; // no pouch allow default pickup

    const container = getLinkedContainerFromPouch(player, pouchStack.stack);
    addToContainer(event, container);
  };

  COIN_IDS.forEach(id => {
    ItemEvents.canPickUp(id, coinPickupHandler);
  });

  const addToContainer = (event, container) => {
    const origCount = event.item.getCount();
    const remainders = container.addItem(event.item);
    const remainderCnt = remainders.getCount();
    const numInserted = origCount - remainderCnt;

    // Nothing inserted, bag full, fallback to vanilla pickup
    if (!numInserted) {
      return;
    }

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

  const getPouchStack = (player) => {
    const curiosInv = CuriosApi.getCuriosInventory(player);
    if (!curiosInv.isPresent()) {
      console.warn('[cowpewter_bap] no curios found');
      return { stack: null, curios: null };
    }
    const curios = curiosInv.get();
    const slotHandler = curios.getStacksHandler('coin_pouch');
    if (!slotHandler.isPresent()) {
      console.warn('[cowpewter_bap] no pouch slot found');
      return { stack: null, curios: curios };
    }
    const slot = slotHandler.get();
    const stack = slot.getStacks().getStackInSlot(0);
    if (stack.isEmpty()) {
      console.info('[cowpewter_bap] no pouch found in slot');
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
    for (var i = 0; i < POUCH_SLOTS; i++) {
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
        console.warn('[cowpewter_bap] pouch moved');
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
    OPEN_POUCHES[player.username] = tempInv;
    player.openInventoryGUI(tempInv, Text.of('Coin Pouch'));
  };

  PlayerEvents.inventoryClosed('kubejs:menu', event => {
    if (!event.player) return;
    delete OPEN_POUCHES[event.player.username];
  });


})();
