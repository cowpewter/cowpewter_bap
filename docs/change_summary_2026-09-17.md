# Changes

1. Massive cleanup with eslint, we can now actually enforce style and ensure code is Rhino-safe. `npm lint`, `npm lint-fix`

2. Mod Changes - removed wd's Selling Bin, added Wallet

3. Oops, some of my changes to wanderer_trades.js got committed with the style fix oh well. Anyway, time to completely rewrite how trades are handled.

4. Ugh, removed Wallet, the coins are NOT ITEMS so I can't hand them to the wandering trader. Writing it all myself, gonna find some cute coin assets on itchio

5. I couldn't find cute coins on itchio that would suit. Made my own, plus coin pouch icon, in Pixelorama. They're crappy, but good enough for now.

6. Scripted out the coin pouch - own curio slot, keep on death, spawn in world with one already equipped and it is not removable. Keybind to open, default `P`. Commited here.

7. Okay, time to script auto-pickup coins with pouch. Wasn't too bad, just lots of weird passing containers around. Committed

8. Almost there, all that's left is tooltip and lang file. I would have liked to also put a live-updating `Total $x` in the pouch's GUI screen, but alas, Claude says that would require a full Java mod, not doable with kube. So gonna just skip, rather than have a "buggy" total display

9. Turned off no-console in eslint, Claude's right, its our only visibility, using it is inescapable.

10. And its shipping bin time. First I had Claude update the python script that generates the price data, it's now a JS file so we can actually read it from kubejs scripts. Created block defn (still needs real texture), recipe, then implemented the right-click handler for opening the container.

11. It works! The scripted shipping bin works. Is it the best UX ever? No. Is it good enough for jam? Absolutely. Put items in bin, auto-sold on close, deposited directly into coin pouch, overflows into player inventory

## TO CHECK

Worth confirming what entity.owner actually is while you're there. If Animal Husbandry stores a UUID rather than a player entity, then
  owner.server and owner.username are wrong too, and you'd need to resolve the player from the UUID. A one-line log on a genuinely bred baby
  will tell you:

  console.info('owner=' + entity.owner + ' type=' + typeof entity.owner);

  The same entity.owner pattern is in your death handler at line 170, so whatever you learn applies there too.
