// Modifications to More Useful Copper.
// Fixes swapped armor stats (chestplate/leggings)
// Removes Lightning Charged effect entirely, ran off of isFoil anyway which is also true for enchanted items
// * Removes tooltip lines (ItemTooltipEvent)
// * Removes armor effects (MobEffectEvent.Applicable)
// * Prevents extra axe knockback (LivingKnockBackEvent)
// * Prvents pickaxe Wither (MobEffectEvent.Applicable)
// * Prevents shovel fire (Attack + damage + tick)
// * Prevents hoe right-click-heal (RightClickItem)
// * See also server_scripts/copper_uncharge.js.
// Changes Copper's Mining Speed to match Iron (was faster than ANYTHING ELSE)

(function () {
  let MOD = 'more_useful_copper:';
  let TOOLS = ['copper_pickaxe', 'copper_axe', 'copper_shovel', 'copper_hoe'];
  let ARMOR_DEFENSE = { copper_chestplate: 6, copper_leggings: 5 };
  let ARMOR = ['copper_helmet', 'copper_chestplate', 'copper_leggings', 'copper_boots'];

  // ---- stats ---------------------------------------------------------------

  let ItemAttributeModifiers = Java.loadClass('net.minecraft.world.item.component.ItemAttributeModifiers');
  let AttributeModifier = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier');
  let Attributes = Java.loadClass('net.minecraft.world.entity.ai.attributes.Attributes');

  ItemEvents.modification(function (event) {
    let i;
    for (i = 0; i < TOOLS.length; i++) {
      event.modify(MOD + TOOLS[i], function (item) {
        // setTier rebuilds the tool component, which is where speed lives
        item.setTier(function (tier) { tier.setSpeed(6.0); });
      });
    }

    for (let name in ARMOR_DEFENSE) {
      let defense = ARMOR_DEFENSE[name];
      event.modify(MOD + name, function (item) {
        // Armor keeps its defaults on the item, not in a component. Copy them
        // into the component with the armor value replaced; the component wins.
        let old = item.item().getDefaultAttributeModifiers().modifiers();
        let b = ItemAttributeModifiers.builder();
        for (let j = 0; j < old.size(); j++) {
          let e = old.get(j);
          let mod = e.modifier();
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

  let MobEffectApplicable = Java.loadClass('net.neoforged.neoforge.event.entity.living.MobEffectEvent$Applicable');
  let ApplicableResult = Java.loadClass('net.neoforged.neoforge.event.entity.living.MobEffectEvent$Applicable$Result');
  let LivingKnockBackEvent = Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingKnockBackEvent');
  let LivingIncomingDamageEvent = Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent');
  let AttackEntityEvent = Java.loadClass('net.neoforged.neoforge.event.entity.player.AttackEntityEvent');
  let RightClickItem = Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$RightClickItem');
  let PlayerTickPost = Java.loadClass('net.neoforged.neoforge.event.tick.PlayerTickEvent$Post');
  let ItemTooltipEvent = Java.loadClass('net.neoforged.neoforge.event.entity.player.ItemTooltipEvent');

  let TOOLTIP_LINES = [
    'Holds lightning that withers enemies...',
    'Imbued with knockback from lightning...',
    'Imbued with lightning that burns enemies...',
    'Holds a healing effect powered by lightning...',
    'The residual lightning charge attracts more lightning...',
  ];

  // Everything LightningArmorItem grants. Its instances are exactly 10 ticks
  // and hidden, which nothing else in the pack uses together (beacons are
  // ambient and longer, potions are visible).
  let ARMOR_EFFECTS = [
    'minecraft:night_vision',
    'minecraft:regeneration',
    'minecraft:fire_resistance',
    'minecraft:speed',
    'minecraft:jump_boost',
    'minecraft:strength',
  ];

  function wearsCopperArmor(entity) {
    let it = entity.getArmorSlots().iterator();
    while (it.hasNext()) {
      if (ARMOR.indexOf(String(it.next().id).replace(MOD, '')) >= 0) return true;
    }
    return false;
  }

  // True if target was hit this tick by something holding itemId.
  function hitThisTickWith(target, itemId) {
    let attacker = target.getLastHurtByMob();
    if (attacker === null) return false;
    if (target.getLastHurtByMobTimestamp() !== target.tickCount) return false;
    return String(attacker.getMainHandItem().id) === itemId;
  }

  // A script error inside a NativeEvents handler is not caught by KubeJS: it
  // crashes the game, and in a per-tick event it crashes every world load.
  // Log the first failure per handler and carry on.
  function guarded(name, fn) {
    let reported = false;
    return function (event) {
      try {
        fn(event);
      } catch (e) {
        if (!reported) {
          reported = true;
          console.log('[cowpewter_bap] copper_gear.js ' + name + ' failed, further errors hidden: ' + e);
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
    let inst = event.getEffectInstance();
    let id = String(inst.getEffect().getRegisteredName());
    let entity = event.getEntity();

    let armorBuff = inst.getDuration() === 10 && !inst.isVisible() && !inst.isAmbient() &&
      ARMOR_EFFECTS.indexOf(id) >= 0 && wearsCopperArmor(entity);
    // new MobEffectInstance(WITHER, 40, 0) in LightningPickaxeItem.hurtEnemy
    let pickaxeWither = id === 'minecraft:wither' && inst.getDuration() === 40 &&
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
  let shovelHits = {};   // uuid -> { fireBefore, untilTick }
  let SHOVEL_WINDOW_TICKS = 2;

  NativeEvents.onEvent(AttackEntityEvent, guarded('shovel attack', function (event) {
    let player = event.getEntity();
    if (player.level.isClientSide()) return;
    if (String(player.getMainHandItem().id) !== MOD + 'copper_shovel') return;
    shovelHits[player.uuid] = {
      fireBefore: player.getRemainingFireTicks(),
      untilTick: player.tickCount + SHOVEL_WINDOW_TICKS,
    };
  }));

  NativeEvents.onEvent(LivingIncomingDamageEvent, guarded('shovel damage', function (event) {
    // KubeJS renames DamageSource.getMsgId() to getType()
    if (String(event.getSource().getType()) !== 'onFire') return;
    let entity = event.getEntity();
    if (!entity.isPlayer() || entity.level.isClientSide()) return;
    let hit = shovelHits[entity.uuid];
    if (!hit || entity.tickCount > hit.untilTick) return;
    event.setCanceled(true);
    entity.setRemainingFireTicks(hit.fireBefore);
  }));

  NativeEvents.onEvent(PlayerTickPost, guarded('shovel tick', function (event) {
    let player = event.getEntity();
    let hit = shovelHits[player.uuid];
    if (!hit || player.level.isClientSide()) return;
    if (player.getRemainingFireTicks() > hit.fireBefore) player.setRemainingFireTicks(hit.fireBefore);
    if (player.tickCount > hit.untilTick) delete shovelHits[player.uuid];
  }));
})();
