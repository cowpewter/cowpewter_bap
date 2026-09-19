# Changes

1. So many quest - filled out Kitchen finally.

2. I _think_ maybe I have all the quests I need? Other than redoing all the breeding stuff I guess. But the other chapters I mean, the "easy" ones. I think I'll have to catch gaps in playtesting.

3. Okay time to tackle the breeding questline. I think I can hook into the bapOwner on entity spawn stuff instead of requiring the player to manually inspect every bred animal with the ledger or glass.

4. Okay so instead of that, first I refactored everything that used `player.username` as a lookup key to `player.uuid`

5. Then I actually tackled the breeding questline. The quests themselves still have some placeholder text because wow i can't word right now. But they should theoretically work.

6. Um... I'm running out of things to fiddle before I need to playtest again. I need to fix the missing texture on Shipping Bin at min I guess before making a new build?

7. Okay time to make 0.2.0-alpha and playtest it on the Deck

## Post Playtest

Oofta. So it both went amazingly well in that most of it really does work exactly how it's supposed to. That said I still have a list of like 25+ fixes and changes in [this doc](playtest-2026-09-19.md). I'll just cross stuff out as I go and note changes here.

1. Installed Carry On

2. Installed Better Than Mending, so players can heal any tool with Mending (gettable from table) without having to earn xp with it equipped

3. Removed More Useful Copper Wax Scraper and Spray Bottle. Don't need them and the scraper recipe conflicts with flint knife.

4. Added #cowpewter_bap:rices tag so both Rice and Rice Panicle count for rice acquisition quest

5. Updated regenerate_prices.py to adjust calculations of base items, excluding intermediary ingredients like chopped raw meats, dough/raw pasta, bowls, compost, etc are no longer shippable.

6. Resolved duplicate recipe - Fried Egg - Farmer's Delight vs Animal Husbandry. Kept FD, hid AH. Added new hide files `asstd_other_dupes.js` to client and server scripts. Right now it only removes the dupe egg. There just wasn't another appropriate file for those changs. The only hide scripts prior were weapon-specific and more useful copper-specific.

7. Re-updated regenerate_prices.py cause I was still not happy with it.

8. Fixed Completionism quest generation - specifically what chapters everything slots into, must be explicit now




