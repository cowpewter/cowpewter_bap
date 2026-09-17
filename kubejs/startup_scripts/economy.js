
// Create our coins
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
});