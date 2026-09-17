(function () {
  const CurioCanUnequipEvent = Java.loadClass('top.theillusivec4.curios.api.event.CurioCanUnequipEvent');
  const TriState = Java.loadClass('net.neoforged.neoforge.common.util.TriState');

  // Create our coins and pouch
  StartupEvents.registry('item', event => {
    // rarities: common | uncommon | rare | epic
    // glow = enchant glimmer

    event.create('cowpewter_bap:coin_1')
      .displayName('Copper Coin')
      .maxStackSize(64)
      .rarity('common')
      .glow(false)
      .tooltip('$1');

    event.create('cowpewter_bap:coin_10')
      .displayName('Iron Coin')
      .maxStackSize(64)
      .rarity('uncommon')
      .glow(false)
      .tooltip('$10');

    event.create('cowpewter_bap:coin_100')
      .displayName('Gold Coin')
      .maxStackSize(64)
      .rarity('rare')
      .glow(false)
      .tooltip('$100');

    event.create('cowpewter_bap:coin_500')
      .displayName('Diamond Coin')
      .maxStackSize(64)
      .rarity('epic')
      .glow(false)
      .tooltip('$500');

    event.create('cowpewter_bap:coin_pouch')
      .displayName('Coin Pouch')
      .maxStackSize(1)
      .rarity('common')
      .glow(false);
  });

  // Prevent player from removing Coin Pouch from curio slot
  NativeEvents.onEvent(CurioCanUnequipEvent, event => {
    const stack = event.getStack();
    if (stack && String(stack.id) === 'cowpewter_bap:coin_pouch') {
      event.setUnequipResult(TriState.FALSE);
    }
  });

  // Keybind for opening Coin Pouch UI
  KeyBindEvents.registry(event => {
    event
      .register('cowpewter_bap.open_pouch')
      .defaultKey('KEY_P')
      .inGame()
      .category('Seed & Stock');
  });
})();
