# Breeding quests don't credit the player

Investigated 2026-09-21 against AnimalHusbandry 0.4.1 (neoforge), from the
Seed.Stock-0.4.0-beta playtest logs.

## Symptom

A calf is born from a normal Animal Husbandry pregnancy and the player gets
nothing — neither the vanilla *The Parrots and the Bats* advancement nor
`cowpewter_bap:quest/breed_animal`. Occasionally a calf *does* pop both, which
made it look like "the first breed fails and later ones work."

## Root cause

Animal Husbandry replaces vanilla breeding with a pregnancy system, and its
birth path never touches the vanilla breeding machinery.

`AnimalMixin.animalhusbandry$startPregnancy` injects at the **HEAD** of
`Animal.spawnChildFromBreeding(ServerLevel, Animal)` and calls `ci.cancel()`.
So at mating time there is no child — it only sets `isPregnant` and
`pregnancyTicks` on the dam, resets love on both parents, and drops the XP orbs.
Because the method is cancelled before its body runs, NeoForge never fires
`BabyEntitySpawnEvent` and vanilla never fires the `bred_animals` criterion.

The actual birth happens later, in `AnimalMixin.onAiStep` (injected at the head
of `aiStep`), when `pregnancyTicks` reaches zero:

```
getBreedOffspring(level, dam) → setBaby(true) → moveTo(dam position)
  → AnimalGenetics.breed(...) → addFreshEntityWithPassengers(child)
```

That is the whole path. No `BabyEntitySpawnEvent`, no `CriteriaTriggers.BRED_ANIMALS`.

Consequences for our scripts:

- `startup_scripts/breeding_owner.js` listens on `BabyEntitySpawnEvent`, so it
  never stamps the owner on a gestation calf. `getBreedOffspring` returns a
  blank `EntityType.COW.create(...)` with empty persistent data.
- `server_scripts/tamebreed_quest_bridge.js` then early-returns at
  `if (!owner) return;` in `EntityEvents.spawned`, so `ADV_BREED`, the herd
  counters and all the genetics advancements are skipped.
- Vanilla *Parrots and the Bats* and *Two by Two* never progress for any
  managed species.

`EntityEvents.spawned` itself **does** fire for gestation calves —
`addFreshEntityWithPassengers` posts `EntityJoinLevelEvent` normally. The event
is fine; only the ownership stamp is missing.

## Why one birth appeared to work

`startPregnancy` returns *without* cancelling when any of these hold, in which
case vanilla runs normally and produces an instant calf with full credit:

- the animal is a chicken (explicitly excluded — chickens always breed vanilla-style)
- either parent's `animalhusbandry:genetics` attachment is null
- the female's `careData` is null, **or `careData.isPregnant` is already true**

That last one is what we actually hit. An already-pregnant cow that mates a
second time falls straight through to vanilla and pops an instant calf while
her real gestation keeps ticking.

Evidence from `latest.log` for the 07:25:54 calf:

- the advancement fired at `.054` and the entity joined the level at `.055` —
  that is `finalizeSpawnChildFromBreeding` ordering (trigger, then
  `addFreshEntity`); the gestation path has no trigger at all
- the calf already carried the owner key at join, which only
  `BabyEntitySpawnEvent` can set
- the Farm Ledger read *"Pregnant! (Est. 2 days remaining)"* 1.5 s earlier, and
  only ~64k of the required 72k `gestationTicksCow` had elapsed (tick sprint
  started 07:19:26, ~155 tps)
- there is exactly one cow spawn in the whole log; the 07:16 pregnancy never
  delivered before the log ends

So the rule is **not** "the first breed fails." It is: *gestation births never
credit anyone; only births that bypassed the pregnancy system do.*

## Fix

Stop depending on `BabyEntitySpawnEvent` for ownership. The mod spawns the calf
at the dam's exact position (`moveTo(dam.getX(), dam.getY(), dam.getZ())`), so
the dam is the nearest owned adult of the same type at spawn time.

In `server_scripts/tamebreed_quest_bridge.js`, add the helper:

```js
  var ADOPT_RADIUS = 6.0;

  // Animal Husbandry's gestation birth spawns the calf straight into the world via
  // addFreshEntityWithPassengers, so BabyEntitySpawnEvent never fires and
  // startup_scripts/breeding_owner.js never stamps it. The dam is standing at the
  // calf's spawn position, so inherit from her.
  function inheritOwnerFromDam(entity, entityType) {
    var nearby = entity.level.getEntities(entity, entity.boundingBox.inflate(ADOPT_RADIUS));
    var best = null;
    var bestDist = Infinity;
    for (var i = 0; i < nearby.size(); i++) {
      var other = nearby.get(i);
      if (other.baby || String(other.type) !== entityType) continue;
      if (!getOwnerId(other)) continue;
      var d = other.distanceToSqr(entity);
      if (d < bestDist) { bestDist = d; best = other; }
    }
    if (!best) return '';
    var ownerId = getOwnerId(best);
    setOwnerId(entity, ownerId);
    return ownerId;
  }
```

and call it in `EntityEvents.spawned`, immediately before the owner lookup:

```js
    if (entity.baby && !getOwnerId(entity)) {
      inheritOwnerFromDam(entity, entityType);
    }

    // Unowned parents, so nobody gets the credit
    var owner = getOwner(entity);
    if (!owner) return;
```

`breeding_owner.js` can stay as-is — it still covers the vanilla path, costs
nothing, and `getOwnerId(entity)` being non-empty short-circuits the scan.

Notes:

- This is path-agnostic: it fixes gestation births and leaves vanilla births
  working, so it does not matter which path a given calf took.
- Picking the *closest* owned adult matters when two players' herds are mixed in
  one pen. The dam is at distance ~0, so closest is always right.
- The scan is read-only and runs once per eligible baby spawn, so the cost is
  irrelevant.

## Still needed: vanilla advancements

*The Parrots and the Bats* (`minecraft:husbandry/breed_an_animal`) will still
never fire for a gestation birth. If a quest gates on it, grant it alongside
`ADV_BREED`.

*Two by Two* (`minecraft:husbandry/breed_all_animals`) cannot be fixed this way —
it has per-species criteria and would have to be granted wholesale or dropped
from the quest line.

Note that `grantAdvancement()` currently shells out through
`server.runCommandSilent('advancement grant ...')`, which cuts against the
no-commands-in-KubeJS rule. Worth moving to `player.advancements.award(...)` if
we touch it, but that is a separate change.

## Testing

Gestation is `gestationTicksCow: 72000` (3 MC days) in
`config/animalhusbandry.json`. Drop it to ~`200` to get a birth in about ten
seconds rather than tick-sprinting for an hour. The other species have their own
`gestationTicks*` keys.

To be sure you are testing the *gestation* path and not an accidental
double-mate, check the ledger says the dam is pregnant first, and confirm the
advancement fires **after** the `EntityEvents.spawned` handler rather than a
millisecond before it.
