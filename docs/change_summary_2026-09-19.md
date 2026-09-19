# Changes

1. So many quest - filled out Kitchen finally.

2. I _think_ maybe I have all the quests I need? Other than redoing all the breeding stuff I guess. But the other chapters I mean, the "easy" ones. I think I'll have to catch gaps in playtesting.

3. Okay time to tackle the breeding questline. I think I can hook into the bapOwner on entity spawn stuff instead of requiring the player to manually inspect every bred animal with the ledger or glass.

4. Okay so instead of that, first I refactored everything that used `player.username` as a lookup key to `player.uuid`


