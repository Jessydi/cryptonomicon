export const loadCoins = () => {
  return fetch(
    `https://min-api.cryptocompare.com/data/all/coinlist?summary=true`
  ).then((r) => r.json());
};
