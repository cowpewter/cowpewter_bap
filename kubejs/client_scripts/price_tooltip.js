(function () {
  ItemEvents.modifyTooltips(event => {
    var id;
    for (id in global.BAP_PRICES) {
      if (global.BAP_PRICES.hasOwnProperty(id)) {
        event.add(id, [Text.gray(`Sells for $${global.BAP_PRICES[id]}`)]);
      }
    }
  });
})();