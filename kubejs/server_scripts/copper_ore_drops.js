(function () {
    // Vanilla copper ore drops 2-5 raw copper before fortune, which floods the
    // early game. Drop the base to 1 and re-apply the vanilla ore_drops fortune
    // formula on top, so enchanted pickaxes still scale normally.
    //
    // Silk touch is unaffected: that path drops the ore block itself, so there
    // is no raw_copper stack for the filter to match.
    LootJS.modifiers(event => {
        event.addBlockModifier('#minecraft:copper_ores')
            .replaceLoot(
                'minecraft:raw_copper',
                LootEntry.of('minecraft:raw_copper')
                    .setCount(1)
                    .applyOreBonus('minecraft:fortune')
            );
    });
})();
