(function () {
  const getOpenCommand = (username) =>
      `questlog open questlog:none ${username}`;

  ItemEvents.rightClicked('cowpewter_bap:guide_book', (event) => {
    if (!event.player) return;

    // Vanilla chests eat the click and open instead of opening book
    // make similar behavior for ship bin
    const target = event.getTarget();
    if (target.type == 'BLOCK' &&
        String(target.block.id) === 'cowpewter_bap:shipping_bin'
    ) {
      return;
    }

    const cmd = getOpenCommand(event.player.username);
    event.server.runCommandSilent(cmd);
    event.cancel();
  });
})();
