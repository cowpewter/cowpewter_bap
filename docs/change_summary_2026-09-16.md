# Today's Plans

1. ~~Get Claude to write a script to regenerate tools/fd_recipes so we can remove that data from the repo. Seems silly to check in, and I'll need the script if FD ever needs to be updated.~~

Plus I'm probably going to need that data for generating quest files for Completionism anyway.

2.~~ QoL/Polish - need to strip every enchantment in the game that's not actually useful without combat so your chances of getting something nice are higher. Also add Mending to Enchanting Table pool so its actually achievable, it can be rare, but it should exist. Otherwise the only source is fishing.~~

To Remove:
Sharpness
Smite
Bane of Arthropods
Sweeping Edge
Fire Aspect
Knockback
Cleaving
Impaling
Channeling
Power
Punch
Flame
Piercing
Multishot
Projectile Protection
Blast Protection
Thorns


3. Figure out what I'm doing about the currency. I still hate fractional emeralds.

4. ~~Ask Claude to audit remaining config files against modlist before next release~~

5. Add functionality to Bell (copper i dont think the other is obtainable) to summon Wandering Trader, once per MC day maximum. Maybe turn off natural spawning if he is summonable, OR turn the spawn rate way down so a second trader is a rare treat. 

# Actual Changes

1. fd_recipes stripped from repo, regenerated on generate_prices run

2. Combat-focused enchantments stripped from game, book/gear loot should auto-replace itself with valid enchantment if one slips through. Also made Infinity + Mending compatible on Bows, and made Mending and Swift Sneak rollable on the enchanting table since no villagers and fishing takes forever and deep dark is not a core feature. Removed all Curses also, cause like, why would we need binding or vanishing on a farming pack.

3. While testing enchanting I discovered that More Useful Copper puts all kinds of fancy crap on copper armor/tools, like special effects when charged with lightning and armor full set buffs. Disabled all that crap.

4. Ran config audit, removed 5 stale configs.

5. 