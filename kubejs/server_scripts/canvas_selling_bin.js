(function () {
    ServerEvents.recipes(event => {
        event.replaceInput(
            { id: 'selling_bin:selling_bin' },
            '#minecraft:wool_carpets',
            'farmersdelight:canvas'
        );
    });
})();
