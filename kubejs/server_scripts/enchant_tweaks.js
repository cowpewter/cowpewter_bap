// let Mending and Swift Sneak roll on enchant table

(function () {
  ServerEvents.tags('enchantment', function (event) {
    // Mending rolls at the enchanting table. Treasure-ness is only tags in
    // 1.21.1; the table has no separate treasure check. Mending's own JSON
    // keeps it rare: weight 2, and min_cost 25 means it realistically only
    // rolls in the top slot with full bookshelves.
    event.add('minecraft:in_enchanting_table', 'minecraft:mending');
    console.info('[cowpewter_bap] mending added to the enchanting table');

    // Otherwise only found as books in ancient cities, which a farm pack won't
    // send anyone to. Stays rare: weight 1 and min_cost 25/50/75, so the table
    // can only roll level I.
    event.add('minecraft:in_enchanting_table', 'minecraft:swift_sneak');
    console.info('[cowpewter_bap] swift sneak added to the enchanting table');
  });
})();
