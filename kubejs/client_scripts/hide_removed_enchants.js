// kubejs/client_scripts/hide_removed_enchants.js
// Hides enchanted books for removed enchantments from JEI. Tags and the
// inventory swap are in server_scripts/removed_enchants.js — keep REMOVED
// in sync with the keys of REPLACEMENTS there.
//
// Only takes effect on a full client restart, not /reload or F3+T.

(function () {
  var REMOVED = [
    'minecraft:sharpness',
    'minecraft:smite',
    'minecraft:bane_of_arthropods',
    'minecraft:sweeping_edge',
    'minecraft:fire_aspect',
    'minecraft:knockback',
    'minecraft:impaling',
    'minecraft:channeling',
    'minecraft:power',
    'minecraft:punch',
    'minecraft:flame',
    'minecraft:piercing',
    'minecraft:multishot',
    'minecraft:projectile_protection',
    'minecraft:blast_protection',
    'minecraft:thorns',
    'farmersdelight:backstabbing',
    'minecraft:wind_burst',
    'minecraft:binding_curse',
    'minecraft:vanishing_curse',
  ]

  var EnchantmentHelper = Java.loadClass('net.minecraft.world.item.enchantment.EnchantmentHelper')

  RecipeViewerEvents.removeEntries('item', function (event) {
    var hidden = 0
    // Every book is the same item; only its stored enchantment differs, so
    // this needs a predicate rather than an item ID.
    event.remove(function (stack) {
      if (stack.id !== 'minecraft:enchanted_book') return false
      var it = EnchantmentHelper.getEnchantmentsForCrafting(stack).keySet().iterator()
      while (it.hasNext()) {
        if (REMOVED.indexOf(String(it.next().getRegisteredName())) >= 0) {
          hidden++
          return true
        }
      }
      return false
    })
    console.info('[cowpewter_bap] hid ' + hidden + ' enchanted books from JEI')
  })
})();
