(function () {
  const BabyEntitySpawnEvent = Java.loadClass('net.neoforged.neoforge.event.entity.living.BabyEntitySpawnEvent');

  // Livestock has no vanilla owner, so we stamp one ourselves when a player
  // feeds an animal. Babies inherit it from a parent here, before the child is
  // added to the world, so server_scripts/tamebreed_quest_bridge.js sees an
  // already-stamped baby in EntityEvents.spawned. Keep this key in sync.
  const OWNER_KEY = 'cowpewter_bap:owner';

  // Native events can only be registered from startup scripts, which is the
  // only reason this lives apart from the rest of the quest bridge.
  NativeEvents.onEvent(BabyEntitySpawnEvent, event => {
    const child = event.getChild();
    if (!child) return;

    const parents = [event.getParentA(), event.getParentB()];
    for (let i = 0; i < parents.length; i++) {
      if (!parents[i]) continue;
      let owner = parents[i].persistentData.getString(OWNER_KEY);
      if (owner) {
        child.persistentData.putString(OWNER_KEY, owner);
        return;
      }
    }
  });
})();
