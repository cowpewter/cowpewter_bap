# Summary of Changes

After sleeping on it, I've made some executive decisions:

1. I've removed Caged and Boxed. It doesn't fit the tone, to shove your prize stock in a tiny cage and then in your backpack.

2. I cleaned a bunch of files out of /config for mods that have been deleted previously.

```
deleted:    config/charmofundying-server.toml
deleted:    config/copperagebackport.json
deleted:    config/flywheel-client.toml
deleted:    config/guardvillagers-client.toml
deleted:    config/guardvillagers-common.toml
deleted:    config/guardvillagers-startup.toml
deleted:    config/improved_village_placement.json
```

3. Removed BlockRunner as apparently Via Romana offers a similar path block speed boost to the player.

4. Removed Waystones. It's too "magic" for this pack. Via Romana fits the low tech farm theme much better. From what I can tell from reading the source, it will teleport your mount with you, but not leashed entities. If possible to change with kubejs, awesome, if not, acceptable loss, perhaps some sort of wagon mod might fit the bill better.

5. Removed Elytra Slot (and Caelus, a requirement) - who is ever honestly going to get an elytra in *this* pack? We have gliders, they come with their own curio slot already. If someone DOES get an elytra, it's not like they need chest armor anyway.

6. Better Archeology can only stay if loot tables are tweaked to add seeds. However, I might just remove it, and add some sort of farmer's delight structure mod instead. Guaranteed seeds/crops to loot, more thematic (others' abandoned attempts at past farms?). If Better Archeology goes, so does Explorer's Compass. Nature's Compass stays regardless, finding biomes is more important than finding structures in this pack. ... Okay you know what? The only decent FD structure mod is *way* OP if you find one or more early game. And Better Arch has that pesky Totem of Growth. Okay, removing Better Arch and Explorer's Compass. Finding what few structures remain in this pack should be a fun surprise, not a methodical hunt.

7. Added Yung's Better Mineshafts. Already had Yung's API, and mineshafts are probably the only structure left that has much interest/use, so make em cooler.

8. Replaced Xaero Icon with Icon Fresh. By its own page, if you are using Fresh Animations, you should use Icon Fresh. Then I had to fuss with resource pack versions in general, as a few were not in a recognizable format and downgrading to a previous version fixed it. Note: For icons to show on minimap, press tab!

# Morning Plans

1. Ask Claude to audit remaining config files against modlist

2. Add functionality to Bell to summon Wandering Trader, once per MC day maximum. Maybe turn off natural spawning if he is summonable, OR turn the spawn rate way down so a second trader is a rare treat. 

3. Quests omg