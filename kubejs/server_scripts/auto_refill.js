// kubejs/server_scripts/auto_refill.js
//
// Keeps the main hand stocked from the rest of the inventory:
//   - tools swap out *before* they break        (TOOL_DURABILITY_LEFT)
//   - stacks top up *before* they run dry       (STACK_TOPUP_AT)
//   - anything that empties anyway is replaced reactively, one tick later
//
// Pre-emption is the whole point: once the hand is actually empty you have
// already lost a swing or a placement, and no amount of reacting faster gets
// it back. Sophisticated's Refill Upgrade tops up on a 5-tick cooldown and
// can only replace a tool after it breaks; this beats both.
//
// Server-side, so it works for everyone with no client mod.
// Rhino-safe style: var only, indexed loops, no arrows.

(function () {
  // --- Tuning ---------------------------------------------------------
  // Durability remaining at which a tool is swapped for a fresher copy.
  //   0 = never swap early, only replace it once it has actually broken
  //   1 = swap with one use left, so the tool never breaks     (default)
  //   N = swap with N uses left
  var TOOL_DURABILITY_LEFT = 0

  // Count at which the held stack gets topped up from elsewhere.
  //   0  = never top up early, only refill once the stack is empty
  //   8  = keep at least 8 in hand                             (default)
  //   32 = top up sooner, at the cost of more inventory shuffling
  var STACK_TOPUP_AT = 1

  // A replacement tool must have MORE than this much durability left,
  // else we would just swap into another nearly-dead tool and ping-pong.
  var MIN_REPLACEMENT_DURABILITY = 1

  // Swap across tiers: a dying stone axe will accept a wooden one.
  // false = only ever swap a tool for the exact same item.
  var CROSS_TIER_SWAP = true

  // At equal tier, reach for an unenchanted tool before an enchanted one.
  var AVOID_ENCHANTED = true

  // What counts as "the same kind of tool" for a cross-tier swap. A candidate
  // has to carry the same tag as the worn tool. If the worn tool has none of
  // these, we fall back to exact-item matching, which is the safe behaviour
  // for modded tools that tag themselves oddly. Add your own here.
  var TOOL_TYPE_TAGS = [
    'minecraft:pickaxes',
    'minecraft:axes',
    'minecraft:shovels',
    'minecraft:hoes',
    'minecraft:swords',
    'c:tools/knife',
    'c:tools/shear'
  ]

  // Audible feedback, so a swap that is otherwise invisible still registers.
  // Set SWAP_SOUND to '' to kill the noise entirely.
  var SWAP_SOUND = 'minecraft:entity.item.pickup'
  var SWAP_SOUND_VOLUME = 0.2
  var SWAP_SOUND_PITCH = 2.0

  var SOUND_ON_TOOL_SWAP = true
  var SOUND_ON_STACK_TOPUP = false   // fires while building; noisy on purpose off
  var SOUND_ON_REACTIVE_REFILL = true
  // --------------------------------------------------------------------

  // 0-8 hotbar, 9-35 main. 36-39 armor, 40 offhand -- leave those alone.
  var SEARCH_MAX = 36

  // username -> { slot: int, item: Item } -- what the player held last tick
  var lastHeld = {}

  // Resolved lazily on first use and cached. If the lookup or the packet
  // ever fails we log once and go silent -- a cosmetic pop must never be
  // able to break the refill itself.
  var swapSound = null
  var swapSoundBroken = false

  function playSwapSound(player) {
    if (!SWAP_SOUND || swapSoundBroken) return
    try {
      if (swapSound == null) {
        swapSound = Registry.of('minecraft:sound_event').get(SWAP_SOUND)
      }
      // Vanilla's pickup pop is quiet, high and jittered a little each time.
      var pitch = ((Math.random() - Math.random()) * 0.7 + 1.0) * SWAP_SOUND_PITCH
      player.playNotifySound(swapSound, 'players', SWAP_SOUND_VOLUME, pitch)
    } catch (err) {
      swapSoundBroken = true
      console.warn('[cowpewter_bap] auto_refill: no swap sound (' + err + ')')
    }
  }

  function durabilityLeft(stack) {
    return stack.getMaxDamage() - stack.getDamageValue()
  }

  // Which of TOOL_TYPE_TAGS this tool carries, or null if none of them.
  function toolTypeOf(stack) {
    var i
    for (i = 0; i < TOOL_TYPE_TAGS.length; i++) {
      if (stack.hasTag(TOOL_TYPE_TAGS[i])) return TOOL_TYPE_TAGS[i]
    }
    return null
  }

  // Vanilla naming trap: in getMaxDamage() and getDamageValue(), "damage" means
  // damage done TO the item, never damage the item DEALS. Neither has anything
  // to do with how hard an axe hits -- that is the attack damage tooltip line,
  // which comes from the item's attribute modifiers and is not read here at all.
  //
  // Read them as durability:
  //   getMaxDamage()    damage the item absorbs before breaking, i.e. its total
  //                     durability. Per item TYPE, never changes -> gold 32,
  //                     wood 59, stone 131, iron 250, diamond 1561, nether. 2031
  //   getDamageValue()  wear accumulated so far. Per item COPY, 0 when fresh
  //   durabilityLeft()  the two subtracted, defined above -- what is left
  //
  // So a diamond axe has a bigger getMaxDamage() than a wooden one because it
  // lasts longer, not because it hits harder.
  //
  // Sort key for a candidate, lowest wins, compared element by element:
  //   1. same item as the worn tool -- same tier always beats a cross-tier swap
  //   2. total durability ascending -- otherwise weakest tier first, so the
  //                                    fortune diamond pick is the last resort
  //   3. unenchanted before enchanted within a tier
  //   4. durability remaining, most first -- fewest future swaps
  //
  // Total durability stands in for tier because 1.21 dropped Tier.getLevel()
  // in favour of the incorrect_for_*_tool tags, and it ranks modded tools for
  // free. It does put gold below wood (32 vs 59), which is the right call
  // anyway -- golden tools are the most expendable thing you own.
  function rankOf(stack, heldItem) {
    return [
      stack.getItem() == heldItem ? 0 : 1,
      stack.getMaxDamage(),
      (AVOID_ENCHANTED && stack.isEnchanted()) ? 1 : 0,
      -durabilityLeft(stack)
    ]
  }

  function rankLess(a, b) {
    var i
    for (i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return a[i] < b[i]
    }
    return false
  }

  // Best stand-in for a worn or broken tool. minLeft is the durability floor a
  // candidate must clear: pre-emptively we insist on a genuinely usable tool,
  // but once the old one has actually broken anything beats an empty hand.
  function findReplacementTool(inv, heldItem, heldType, exclude, minLeft) {
    var i, stack, rank
    var bestSlot = -1
    var bestRank = null

    for (i = 0; i < SEARCH_MAX; i++) {
      if (i == exclude) continue
      stack = inv.getStackInSlot(i)
      if (stack.isEmpty() || !stack.isDamageableItem()) continue

      // Same item always qualifies. A different one only qualifies if
      // cross-tier swapping is on and it is the same kind of tool.
      if (stack.getItem() != heldItem) {
        if (!CROSS_TIER_SWAP || heldType == null) continue
        if (!stack.hasTag(heldType)) continue
      }

      if (durabilityLeft(stack) <= minLeft) continue

      rank = rankOf(stack, heldItem)
      if (bestRank == null || rankLess(rank, bestRank)) {
        bestRank = rank
        bestSlot = i
      }
    }
    return bestSlot
  }

  // Pull matching items into the held stack. Components must match exactly
  // (equalsIgnoringCount) -- tipped arrows and fireworks stack to 64 but are
  // very much not interchangeable.
  function topUp(inv, held, sel) {
    var i, stack, pulled
    var needed = held.getMaxStackSize() - held.getCount()
    var grew = false

    for (i = 0; i < SEARCH_MAX && needed > 0; i++) {
      if (i == sel) continue
      stack = inv.getStackInSlot(i)
      if (stack.isEmpty() || !stack.equalsIgnoringCount(held)) continue

      pulled = inv.extractItem(i, needed, false)
      if (pulled.isEmpty()) continue

      held.setCount(held.getCount() + pulled.getCount())
      needed -= pulled.getCount()
      grew = true
    }

    if (grew) inv.setStackInSlot(sel, held)
    return grew
  }

  function findByItem(inv, item, exclude) {
    var i, stack
    for (i = 0; i < SEARCH_MAX; i++) {
      if (i == exclude) continue
      stack = inv.getStackInSlot(i)
      if (!stack.isEmpty() && stack.getItem() == item) return i
    }
    return -1
  }

  PlayerEvents.tick(function (event) {
    var player = event.player
    var inv = player.inventory
    var sel = player.selectedSlot
    var key = player.username
    var held = inv.getStackInSlot(sel)
    var prev = lastHeld[key]
    var src, count, fresh, worn

    // --- Reactive: the hand is already empty ---------------------------
    if (held.isEmpty()) {
      // Only act if it emptied in this same slot -- otherwise the player
      // just scrolled onto an empty hotbar slot, which is not our business.
      if (!prev || prev.slot != sel) return

      src = prev.tool
        ? findReplacementTool(inv, prev.item, prev.type, sel, 0)
        : findByItem(inv, prev.item, sel)
      if (src < 0) {
        delete lastHeld[key]
        return
      }

      count = inv.getStackInSlot(src).getCount()
      inv.setStackInSlot(sel, inv.extractItem(src, count, false))
      player.sendInventoryUpdate()
      if (SOUND_ON_REACTIVE_REFILL) playSwapSound(player)
      return
    }

    // Remember what is in hand so we know what to look for when it goes.
    if (!prev || prev.slot != sel || prev.item != held.getItem()) {
      // Cache the tool type now -- once the hand is empty the stack is gone
      // and there is nothing left to read a tag off.
      lastHeld[key] = {
        slot: sel,
        item: held.getItem(),
        tool: held.isDamageableItem(),
        type: held.isDamageableItem() ? toolTypeOf(held) : null
      }
    }

    // --- Pre-emptive: swap the tool out before it breaks ----------------
    if (held.isDamageableItem()) {
      if (TOOL_DURABILITY_LEFT <= 0) return
      if (durabilityLeft(held) > TOOL_DURABILITY_LEFT) return

      src = findReplacementTool(inv, held.getItem(), toolTypeOf(held), sel,
                                MIN_REPLACEMENT_DURABILITY)
      if (src < 0) return

      // Swap, don't discard -- the worn tool still has a use left in it and
      // may be worth mending or repairing later.
      fresh = inv.getStackInSlot(src).copy()
      worn = held.copy()
      inv.setStackInSlot(sel, fresh)
      inv.setStackInSlot(src, worn)
      player.sendInventoryUpdate()
      if (SOUND_ON_TOOL_SWAP) playSwapSound(player)
      return
    }

    // --- Pre-emptive: top the stack up before it runs dry ---------------
    if (STACK_TOPUP_AT <= 0) return
    if (held.getMaxStackSize() <= 1) return
    if (held.getCount() > STACK_TOPUP_AT) return
    if (held.getCount() >= held.getMaxStackSize()) return

    if (topUp(inv, held, sel)) {
      player.sendInventoryUpdate()
      if (SOUND_ON_STACK_TOPUP) playSwapSound(player)
    }
  })

  PlayerEvents.loggedOut(function (event) {
    delete lastHeld[event.player.username]
  })
})();
