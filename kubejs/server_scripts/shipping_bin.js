(function () {
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
})();
