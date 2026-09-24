(function () {
  StartupEvents.registry('item', event => {
    // rarities: common | uncommon | rare | epic
    // glow = enchant glimmer

    event.create('cowpewter_bap:guide_book')
      .displayName('Guide Book')
      .maxStackSize(1)
      .rarity('common')
      .glow(false)
      .tooltip('Seed & Stock: Guide Book');
  });
})();
