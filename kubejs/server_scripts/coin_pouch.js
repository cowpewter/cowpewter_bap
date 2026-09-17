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

  // Ensure player has coin pouch in curio slot on login
  PlayerEvents.loggedIn(event => {
    const player = event.player;
    if (!player) return;
    const stackData = getPouchStack(player);
    if (!stackData.stack && stackData.curios) {
      stackData.curios.setEquippedCurio('coin_pouch', 0, Item.of('cowpewter_bap:coin_pouch'));
    }
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

  const openPouch = (player, pouch) => {
    if (!player || !pouch) return;

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
      console.info('[cowpewter_bap] pouch content saved');
    });

    player.openInventoryGUI(tempInv, Text.of('Coin Pouch'));
  };
})();
