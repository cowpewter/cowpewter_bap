# Changes

1. Finished fixing the Harvester bug, the RCH mod was consuming the right-click event so I had to hook into its own custom event instead.

2. Fixed auto-refill bug that broke auto-tool-replace

3. Excluded hotbar slots from potential auto-tool-replace sources

4. Fixed missing default keybind/resourcepack configs

5. Fixed invisible beds

6. New coin sprites. They are still shitty programmer art but they look more like coins and less like spherical blobs.

7. New shipping bin texture, edited from vanilla chest (resized, recolored)

8. Added Guide Book item, given to players on start, that will open QuestLog on right-click

9. Added "Sells for $x" tooltips on all shippable items

10. Added Reliable Name Tags for renaming without an anvil

11. Created stub jar for cowpewter_bap so JEI shows `Seed & Stock` instead of `cowpewter_bap`

12. Added Name Tag sub-objective to Love & Care

13. Completed writing all quests but Via Romana which I need to actually play with first ^^;

14. Built 0.3.0-beta and then immediately had to rebuild a 0.3.1-beta because adding `cowpewter_bap.jar` makes Prism do a scary warning on install. I'd rather have ugly tooltips.

