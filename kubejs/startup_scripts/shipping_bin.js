(function () {
  StartupEvents.registry('block', event => {
    event.create('cowpewter_bap:shipping_bin')
      .displayName('Shipping Bin')
      .texture('cowpewter_bap:block/shipping_bin')
      .woodSoundType()
      .hardness(2.5)
      .resistance(3)
      .tagBlock('minecraft:mineable/axe');
  });
})();
