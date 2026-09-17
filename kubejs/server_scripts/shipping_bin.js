(function () {
  const SimpleContainer = Java.loadClass('net.minecraft.world.SimpleContainer');
  const ItemStack = Java.loadClass('net.minecraft.world.item.ItemStack');
  const SoundEvents = Java.loadClass('net.minecraft.sounds.SoundEvents');
  const SoundSource = Java.loadClass('net.minecraft.sounds.SoundSource');

  // Wrap a chest in planks with a slab on top
  ServerEvents.recipes(event => {
    event.shaped('cowpewter_bap:shipping_bin', [
      'PSP',
      'PCP',
      'PPP'
    ], {
      P: '#minecraft:planks',
      C: 'minecraft:chest',
      S: '#minecraft:wooden_slabs'
    });
  });

  const BIN_SLOTS = 27;

  const OPEN_BINS = {};

  const COIN_VALUES = [
    { value: 500, id: 'cowpewter_bap:coin_500' },
    { value: 100, id: 'cowpewter_bap:coin_100' },
    { value: 10, id: 'cowpewter_bap:coin_10' },
    { value: 1, id: 'cowpewter_bap:coin_1' },
  ];

  const totalToCoins = (total) => {
    const coins = [];
    var remaining = total;

    COIN_VALUES.forEach(rung => {
      var numCoins = Math.floor(remaining / rung.value);
      remaining -= numCoins * rung.value;
      while (numCoins > 0) {
        var chunk = Math.min(numCoins, 64);
        coins.push(Item.of(rung.id, chunk));
        numCoins -= chunk;
      }
    });

    return coins;
  };


  PlayerEvents.inventoryClosed('kubejs:menu', event => {
    if (!event.player) return;
    const bin = OPEN_BINS[event.player.username];
    if (!bin) return;

    const numSlots = bin.getContainerSize();
    var total = 0;
    for (var i = 0; i < numSlots; i++) {
      var stack = bin.getItem(i);
      total += priceOf(stack) * stack.count;
    }
    if (total === 0) {
      // Cleanup
      delete OPEN_BINS[event.player.username];
      return;
    }

    const toAdd = totalToCoins(total);
    const pouch = BAP_POUCH.getPouchSlotStack(event.player);
    if (!pouch.stack) {
      // Cleanup
      delete OPEN_BINS[event.player.username];
      return;
    }
    const container = BAP_POUCH.getLinkedContainerFromPouch(event.player, pouch.stack);
    // precondense to maximize room
    BAP_POUCH.condenseContainer(container);
    toAdd.forEach(item => {
      var remainder = container.addItem(item);
      if (remainder.count) {
        event.player.give(remainder);
      } 
    });
    // post condense for cleanup
    BAP_POUCH.condenseContainer(container);

    // Notify player of sale
    event.player.setStatusMessage(Text.of('Sold for $' + total));
    event.player.playNotifySound(SoundEvents.EXPERIENCE_ORB_PICKUP, SoundSource.PLAYERS, 0.8, 1.2);

    // Cleanup
    delete OPEN_BINS[event.player.username];
  });

  PlayerEvents.loggedIn(event => {
    const player = event.player;
    if (!player) return;
    // Cleanup in case player disco'd
    delete OPEN_BINS[player.username];
  });

  PlayerEvents.loggedOut(event => {
    const player = event.player;
    if (!player) return;
    // Cleanup in case player disco'd
    delete OPEN_BINS[player.username];
  });

  // Simple because every sellable item must have a price. No price, no sale, no tags!
  const priceOf = (stack) => {
    return (stack && !stack.isEmpty() && global.BAP_PRICES[String(stack.id)]) || 0;
  };

  const openBin = (player) => {
    if (!player) return;

    // Need to create an array of BIN_SLOTS ItemStack.EMPTY
    // As subclassing SimpleContainer means we can't use the int constructor
    const tempArr = [];
    for (var i = 0; i < BIN_SLOTS; i++) {
      tempArr.push(ItemStack.EMPTY);
    }

    const tempInv = new JavaAdapter(
      SimpleContainer,
      { canPlaceItem: (_, stack) => priceOf(stack) > 0 },
      tempArr
    );
    OPEN_BINS[player.username] = tempInv;
    player.openInventoryGUI(tempInv, Text.of('Shipping Bin'));
  };

  BlockEvents.rightClicked('cowpewter_bap:shipping_bin', event => {
    const player = event.player;
    if (!player) return;

    openBin(player);
    event.cancel();
  });
})();
