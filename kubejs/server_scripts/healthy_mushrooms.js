(function () {
  ServerEvents.recipes(event => {
    event.replaceInput(
      { output: 'animalhusbandry:animal_medicine' },
      'minecraft:brown_mushroom',
      '#cowpewter_bap:healthy_mush'
    );
  });
})();
