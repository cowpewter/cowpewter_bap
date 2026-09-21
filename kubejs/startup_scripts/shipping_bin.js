(function () {
  StartupEvents.registry('block', event => {
    event.create('cowpewter_bap:shipping_bin')
      .displayName('Shipping Bin')
      .textures({
        particle: 'cowpewter_bap:block/shipping_bin',
        down: 'cowpewter_bap:block/shipping_bin_bottom',
        up: 'cowpewter_bap:block/shipping_bin_top',
        north: 'cowpewter_bap:block/shipping_bin',
        south: 'cowpewter_bap:block/shipping_bin',
        east: 'cowpewter_bap:block/shipping_bin',
        west: 'cowpewter_bap:block/shipping_bin',
      })
      .woodSoundType()
      .hardness(2.5)
      .resistance(3)
      .tagBlock('minecraft:mineable/axe')
      .rightClick(_ => {}); // Registering ANY handler here stops the item use phase when right-clicking on the shipping bin with a consumable like milk
  });
})();
