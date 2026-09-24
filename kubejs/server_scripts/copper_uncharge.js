// More Useful Copper marks gear struck by lightning with custom_data
// {charged:1b}, which gives it a glint and lightning effects. Those effects
// are blocked in startup_scripts/copper_gear.js; this strips the flag itself
// so charged gear doesn't keep a fake-enchanted glint.

(function () {
  let DataComponents = Java.loadClass('net.minecraft.core.component.DataComponents');
  let CustomData = Java.loadClass('net.minecraft.world.item.component.CustomData');

  function isCharged(stack) {
    if (stack.isEmpty() || String(stack.id).indexOf('more_useful_copper:copper_') !== 0) return false;
    let data = stack.get(DataComponents.CUSTOM_DATA);
    return data !== null && data.contains('charged');
  }

  // event.item is a snapshot copy and event.slot is a menu index, so the event
  // is only a trigger; fix the real stacks in the inventory.
  PlayerEvents.inventoryChanged(function (event) {
    if (!event.item || !isCharged(event.item)) return;
    let inv = event.player.inventory;
    for (let i = 0; i < inv.getContainerSize(); i++) {
      let stack = inv.getItem(i);
      if (!isCharged(stack)) continue;
      // drops the component entirely if charged was the only key
      CustomData.update(DataComponents.CUSTOM_DATA, stack, function (tag) {
        tag.remove('charged');
      });
    }
  });
})();
