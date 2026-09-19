# Changes

1. So many quest - filled out Kitchen finally.

2. I _think_ maybe I have all the quests I need? Other than redoing all the breeding stuff I guess. But the other chapters I mean, the "easy" ones. I think I'll have to catch gaps in playtesting.

3. Okay time to tackle the breeding questline. I think I can hook into the bapOwner on entity spawn stuff instead of requiring the player to manually inspect every bred animal with the ledger or glass.

4. Okay so instead of that, first I refactored everything that used `player.username` as a lookup key to `player.uuid`

5. Then I actually tackled the breeding questline. The quests themselves still have some placeholder text because wow i can't word right now. But they should theoretically work.

6. Um... I'm running out of things to fiddle before I need to playtest again. I need to fix the missing texture on Shipping Bin at min I guess before making a new build?

