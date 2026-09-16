// kubejs/server_scripts/removed_enchants.js
//
// No combat, so combat enchantments have no job, and curses are just
// punishment. Enchantments are registry
// entries and can't be unregistered; this removes every way to get one.
// JEI hiding is in client_scripts/hide_removed_enchants.js — keep its
// REMOVED list in sync with the keys of REPLACEMENTS below (server and client
// scripts can't share code).
//
//   1. Tags. Every vanilla source pool (enchanting table, librarian trades,
//      random chest/fishing loot, villager gear, mob spawn gear) is built
//      from #minecraft:non_treasure. Treasure enchantments (the curses) skip
//      that tag and are listed directly in on_random_loot and tradeable, so
//      everything is pulled from all three.
//   2. Inventory swap. A few vanilla sources name enchantments directly and
//      skip the tags: trial chamber vault books (the only Wind Burst source)
//      and mob gear, raid vindicator axes, pillager crossbows. When an item carrying a removed enchantment
//      lands in a player's inventory, it is swapped per REPLACEMENTS. Also
//      cleans up old worlds.
//
// Rhino-safe style: var only, indexed loops, no arrows.

(function () {
  // removed enchantment -> kept enchantment it turns into.
  // Level carries over, capped at the replacement's max level.
  // Books always swap. Gear swaps only if the replacement fits that item and
  // doesn't conflict with what's already on it; otherwise it's just removed.
  // Two removed enchantments mapping to one replacement keep the higher level.
  // null = no replacement, just remove it.
  var REPLACEMENTS = {
    // melee
    'minecraft:sharpness':             'minecraft:efficiency',
    'minecraft:smite':                 'minecraft:unbreaking',
    'minecraft:bane_of_arthropods':    'minecraft:efficiency',
    'minecraft:sweeping_edge':         'minecraft:looting',
    'minecraft:fire_aspect':           'minecraft:looting',
    'minecraft:knockback':             'minecraft:unbreaking',
    'farmersdelight:backstabbing':     'minecraft:looting',
    // bow
    'minecraft:power':                 'minecraft:efficiency',
    'minecraft:punch':                 'minecraft:unbreaking',
    'minecraft:flame':                 'minecraft:infinity',
    // trident
    'minecraft:impaling':              'minecraft:luck_of_the_sea',
    'minecraft:channeling':            'minecraft:lure',
    // crossbow
    'minecraft:piercing':              'minecraft:quick_charge',
    'minecraft:multishot':             'minecraft:mending',
    // mace
    'minecraft:wind_burst':            'minecraft:swift_sneak',
    // armor
    'minecraft:projectile_protection': 'minecraft:protection',
    'minecraft:blast_protection':      'minecraft:feather_falling',
    'minecraft:thorns':                'minecraft:unbreaking',
    // curses: a free upgrade for a curse would be backwards
    'minecraft:binding_curse':         null,
    'minecraft:vanishing_curse':       null,
  }

  var SOURCE_TAGS = [
    'minecraft:non_treasure',
    'minecraft:on_random_loot',
    'minecraft:tradeable',
  ]

  var EnchantmentHelper = Java.loadClass('net.minecraft.world.item.enchantment.EnchantmentHelper')
  var Registries = Java.loadClass('net.minecraft.core.registries.Registries')
  var ResourceKey = Java.loadClass('net.minecraft.resources.ResourceKey')
  var ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')

  function idOf(holder) {
    return String(holder.getRegisteredName())
  }

  function isRemoved(holder) {
    return REPLACEMENTS.hasOwnProperty(idOf(holder))
  }

  // null if no such enchantment. getHolder is overloaded and Rhino can't pick
  // one, so use the single-signature OrThrow variant.
  function lookup(registryAccess, id) {
    try {
      return registryAccess.registryOrThrow(Registries.ENCHANTMENT)
        .getHolderOrThrow(ResourceKey.create(Registries.ENCHANTMENT, ResourceLocation.parse(id)))
    } catch (e) {
      return null
    }
  }

  function hasRemoved(stack) {
    // stored_enchantments for books, enchantments for everything else
    var it = EnchantmentHelper.getEnchantmentsForCrafting(stack).keySet().iterator()
    while (it.hasNext()) {
      if (isRemoved(it.next())) return true
    }
    return false
  }

  // Swaps removed enchantments on stack in place. Returns true if the stack
  // is a book left with no enchantments at all (only possible when every
  // replacement was null or conflicted with something already on it).
  function swapEnchantments(stack, registryAccess) {
    var isBook = stack.id === 'minecraft:enchanted_book'
    if (!hasRemoved(stack)) return false

    var left = EnchantmentHelper.updateEnchantments(stack, function (m) {
      // collect before removing; keySet is live
      var swaps = []
      var keys = m.keySet().iterator()
      while (keys.hasNext()) {
        var h = keys.next()
        if (isRemoved(h)) swaps.push({ to: REPLACEMENTS[idOf(h)], level: m.getLevel(h) })
      }
      m.removeIf(isRemoved)

      var i
      for (i = 0; i < swaps.length; i++) {
        if (swaps[i].to === null) continue
        var rep = lookup(registryAccess, swaps[i].to)
        if (rep === null) continue
        var level = Math.min(swaps[i].level, rep.value().getMaxLevel())
        if (m.getLevel(rep) > 0) {
          m.upgrade(rep, level)   // already there: keep the higher level
          continue
        }
        if (!isBook && !rep.value().isSupportedItem(stack)) continue
        if (!EnchantmentHelper.isEnchantmentCompatible(m.keySet(), rep)) continue
        m.set(rep, level)
      }
    })

    return isBook && left.isEmpty()
  }

  ServerEvents.tags('enchantment', function (event) {
    var n = 0
    for (var id in REPLACEMENTS) {
      for (var t = 0; t < SOURCE_TAGS.length; t++) {
        event.remove(SOURCE_TAGS[t], id)
      }
      n++
    }
    console.info('[cowpewter_bap] removed ' + n + ' enchantments from ' + SOURCE_TAGS.join(', '))
  })

  // Catch typos and replacements that are themselves removed.
  ServerEvents.loaded(function (event) {
    var ra = event.server.registryAccess()
    for (var id in REPLACEMENTS) {
      var to = REPLACEMENTS[id]
      if (to === null) continue
      if (REPLACEMENTS.hasOwnProperty(to)) {
        console.error('[cowpewter_bap] ' + id + ' is replaced by ' + to + ', which is also removed')
      } else if (lookup(ra, to) === null) {
        console.error('[cowpewter_bap] ' + id + ' is replaced by unknown enchantment ' + to)
      }
    }
  })

  // event.item is a snapshot copy (vanilla hands slot listeners a copy) and
  // event.slot is a menu slot index, not an inventory index. So the event is
  // only a trigger: fix the real stacks by scanning the inventory.
  PlayerEvents.inventoryChanged(function (event) {
    if (!event.item || event.item.isEmpty() || !hasRemoved(event.item)) return
    var inv = event.player.inventory
    var ra = event.player.server.registryAccess()
    for (var i = 0; i < inv.getContainerSize(); i++) {
      var stack = inv.getItem(i)
      if (stack.isEmpty()) continue
      if (swapEnchantments(stack, ra)) inv.setItem(i, Item.of('minecraft:book', stack.count))
    }
  })
})();
