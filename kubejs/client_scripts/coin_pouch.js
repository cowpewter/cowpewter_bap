(function () {
  const DataComponents = Java.loadClass('net.minecraft.core.component.DataComponents');

  const getStackValue = (stack) => {
    var value = 0;
    switch (String(stack.id)) {
    case 'cowpewter_bap:coin_1':
      value = 1;
      break;
    case 'cowpewter_bap:coin_10':
      value = 10;
      break;
    case 'cowpewter_bap:coin_100':
      value = 100;
      break;
    case 'cowpewter_bap:coin_500':
      value = 500;
      break;
    }
    return stack.count * value;
  };

  KeyBindEvents.pressed('cowpewter_bap.open_pouch', event => {
    event.player.sendData('cowpewter_bap:open_pouch');
  });

  ItemEvents.modifyTooltips(event => {
    event.modify(Ingredient.of('cowpewter_bap:coin_pouch'), builder => {
      builder.dynamic('cowpewter_bap:pouch_total');
    });
  });

  ItemEvents.dynamicTooltips('cowpewter_bap:pouch_total', event => {
    const pouch = event.item.get(DataComponents.CONTAINER);
    if (!pouch) {
      event.lines.add(Text.of('Total: $0'));
      return;
    }

    var contentLength = pouch.getSlots();
    var total = 0;
    var stack;
    for (var i = 0; i < contentLength; i++) {
      stack = pouch.getStackInSlot(i);
      total += getStackValue(stack);
    }
    event.lines.add(Text.of('Total: $' + total));
  });
})();
