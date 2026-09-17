// kubejs/startup_scripts/copper_gear.js
//
// Fixes for More Useful Copper's tools and armor. Startup script, so it needs
// a full game restart, and it runs on both client and server. Most of the
// lightning effects run on both sides and need blocking on both.
//
// STATS
//   - mining speed 10 -> 6, same as iron (was faster than diamond)
//   - chestplate/leggings defense 5/6 -> 6/5; the mod has them backwards
//
// LIGHTNING, disabled entirely
// The mod's "charged" check is isFoil(), which is also true for any enchanted
// item, so enchanted copper gear acted charged. Some effects don't check at
// all. The item classes can't be patched from here, so each effect is blocked
// at the NeoForge event it goes through:
//   - tooltip lines ("Holds lightning that...")    ItemTooltipEvent
//   - armor: night vision, regen, fire res, speed, full-set jump/strength
//                                                   MobEffectEvent.Applicable
//   - axe: extra knockback on hit                   LivingKnockBackEvent
//   - pickaxe: withers what it hits (always on)     MobEffectEvent.Applicable
//   - shovel: sets YOU on fire on hit (always on)   Attack + damage + tick
//   - hoe: right-click heal + cooldown (always on)  RightClickItem
// The "charged" flag itself (and its glint) is stripped by
// server_scripts/copper_uncharge.js.
//
// Rhino-safe style: var only, indexed loops, no arrows.

(function () {
  var MOD = 'more_useful_copper:';
  var TOOLS = ['copper_pickaxe', 'copper_axe', 'copper_shovel', 'copper_hoe'];
  var ARMOR_DEFENSE = { copper_chestplate: 6, copper_leggings: 5 };
  var ARMOR = ['copper_helmet', 'copper_chestplate', 'copper_leggings', 'copper_boots'];

  // ---- stats ---------------------------------------------------------------

  var ItemAttributeModifiers = Java.loadClass('net.minecraft.world.item.component.ItemAttributeModifiers');
  var AttributeModifier = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier');
  var Attributes = Java.loadClass('net.minecraft.world.entity.ai.attributes.Attributes');

  ItemEvents.modification(function (event) {
    var i;
    for (i = 0; i < TOOLS.length; i++) {
      event.modify(MOD + TOOLS[i], function (item) {
        // setTier rebuilds the tool component, which is where speed lives
        item.setTier(function (tier) { tier.setSpeed(6.0); });
      });
    }

    for (var name in ARMOR_DEFENSE) {
      var defense = ARMOR_DEFENSE[name];
      event.modify(MOD + name, function (item) {
        // Armor keeps its defaults on the item, not in a component. Copy them
        // into the component with the armor value replaced; the component wins.
        var old = item.item().getDefaultAttributeModifiers().modifiers();
        var b = ItemAttributeModifiers.builder();
        for (var j = 0; j < old.size(); j++) {
          var e = old.get(j);
          var mod = e.modifier();
          if (e.attribute().equals(Attributes.ARMOR)) {
            mod = new AttributeModifier(mod.id(), defense, mod.operation());
          }
          b.add(e.attribute(), mod, e.slot());
        }
        // the plain List overload hides attribute lines from the tooltip
        item.setAttributeModifiersWithTooltip(b.build().modifiers());
      });
    }
  });

  // ---- lightning -----------------------------------------------------------

  var MobEffectApplicable = Java.loadClass('net.neoforged.neoforge.event.entity.living.MobEffectEvent$Applicable');
  var ApplicableResult = Java.loadClass('net.neoforged.neoforge.event.entity.living.MobEffectEvent$Applicable$Result');
  var LivingKnockBackEvent = Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingKnockBackEvent');
  var LivingIncomingDamageEvent = Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent');
  var AttackEntityEvent = Java.loadClass('net.neoforged.neoforge.event.entity.player.AttackEntityEvent');
  var RightClickItem = Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$RightClickItem');
  var PlayerTickPost = Java.loadClass('net.neoforged.neoforge.event.tick.PlayerTickEvent$Post');
  var ItemTooltipEvent = Java.loadClass('net.neoforged.neoforge.event.entity.player.ItemTooltipEvent');

  var TOOLTIP_LINES = [
    'Holds lightning that withers enemies...',
    'Imbued with knockback from lightning...',
    'Imbued with lightning that burns enemies...',
    'Holds a healing effect powered by lightning...',
    'The residual lightning charge attracts more lightning...',
  ];

  // Everything LightningArmorItem grants. Its instances are exactly 10 ticks
  // and hidden, which nothing else in the pack uses together (beacons are
  // ambient and longer, potions are visible).
  var ARMOR_EFFECTS = [
    'minecraft:night_vision',
    'minecraft:regeneration',
    'minecraft:fire_resistance',
    'minecraft:speed',
    'minecraft:jump_boost',
    'minecraft:strength',
  ];

  function wearsCopperArmor(entity) {
    var it = entity.getArmorSlots().iterator();
    while (it.hasNext()) {
      if (ARMOR.indexOf(String(it.next().id).replace(MOD, '')) >= 0) return true;
    }
    return false;
  }

  // True if target was hit this tick by something holding itemId.
  function hitThisTickWith(target, itemId) {
    var attacker = target.getLastHurtByMob();
    if (attacker === null) return false;
    if (target.getLastHurtByMobTimestamp() !== target.tickCount) return false;
    return String(attacker.getMainHandItem().id) === itemId;
  }

  // A script error inside a NativeEvents handler is not caught by KubeJS: it
  // crashes the game, and in a per-tick event it crashes every world load.
  // Log the first failure per handler and carry on.
  function guarded(name, fn) {
    var reported = false;
    return function (event) {
      try {
        fn(event);
      } catch (e) {
        if (!reported) {
          reported = true;
          console.error('[cowpewter_bap] copper_gear.js ' + name + ' failed, further errors hidden: ' + e);
        }
      }
    };
  }

  NativeEvents.onEvent(ItemTooltipEvent, guarded('tooltip', function (event) {
    if (String(event.getItemStack().id).indexOf(MOD + 'copper_') !== 0) return;
    event.getToolTip().removeIf(function (line) {
      return TOOLTIP_LINES.indexOf(String(line.getString())) >= 0;
    });
  }));

  NativeEvents.onEvent(MobEffectApplicable, guarded('effects', function (event) {
    var inst = event.getEffectInstance();
    var id = String(inst.getEffect().getRegisteredName());
    var entity = event.getEntity();

    var armorBuff = inst.getDuration() === 10 && !inst.isVisible() && !inst.isAmbient() &&
      ARMOR_EFFECTS.indexOf(id) >= 0 && wearsCopperArmor(entity);
    // new MobEffectInstance(WITHER, 40, 0) in LightningPickaxeItem.hurtEnemy
    var pickaxeWither = id === 'minecraft:wither' && inst.getDuration() === 40 &&
      inst.getAmplifier() === 0 && hitThisTickWith(entity, MOD + 'copper_pickaxe');

    if (armorBuff || pickaxeWither) event.setResult(ApplicableResult.DO_NOT_APPLY);
  }));

  // LightningAxeItem.hurtEnemy calls knockback(2.0). A normal hit is 0.4, and
  // Knockback enchant is removed from the pack, so 2.0 is the mod's.
  NativeEvents.onEvent(LivingKnockBackEvent, guarded('knockback', function (event) {
    if (event.getOriginalStrength() !== 2.0) return;
    if (hitThisTickWith(event.getEntity(), MOD + 'copper_axe')) event.setCanceled(true);
  }));

  NativeEvents.onEvent(RightClickItem, guarded('hoe', function (event) {
    if (String(event.getItemStack().id) === MOD + 'copper_hoe') event.setCanceled(true);
  }));

  // LightningShovelItem.hurtEnemy ignites the attacker for 4s. There's no
  // event after hurtEnemy, so remember the fire state when the attack starts,
  // swallow the fire damage that lands in the next couple of ticks, and put
  // the fire back out.
  var shovelHits = {};   // username -> { fireBefore, untilTick }
  var SHOVEL_WINDOW_TICKS = 2;

  NativeEvents.onEvent(AttackEntityEvent, guarded('shovel attack', function (event) {
    var player = event.getEntity();
    if (player.level.isClientSide()) return;
    if (String(player.getMainHandItem().id) !== MOD + 'copper_shovel') return;
    shovelHits[player.username] = {
      fireBefore: player.getRemainingFireTicks(),
      untilTick: player.tickCount + SHOVEL_WINDOW_TICKS,
    };
  }));

  NativeEvents.onEvent(LivingIncomingDamageEvent, guarded('shovel damage', function (event) {
    // KubeJS renames DamageSource.getMsgId() to getType()
    if (String(event.getSource().getType()) !== 'onFire') return;
    var entity = event.getEntity();
    if (!entity.isPlayer() || entity.level.isClientSide()) return;
    var hit = shovelHits[entity.username];
    if (!hit || entity.tickCount > hit.untilTick) return;
    event.setCanceled(true);
    entity.setRemainingFireTicks(hit.fireBefore);
  }));

  NativeEvents.onEvent(PlayerTickPost, guarded('shovel tick', function (event) {
    var player = event.getEntity();
    var hit = shovelHits[player.username];
    if (!hit || player.level.isClientSide()) return;
    if (player.getRemainingFireTicks() > hit.fireBefore) player.setRemainingFireTicks(hit.fireBefore);
    if (player.tickCount > hit.untilTick) delete shovelHits[player.username];
  }));
})();
