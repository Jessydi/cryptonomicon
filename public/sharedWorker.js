const API_KEY =
  "cd5b86bccf5299f9fda2de5f829a8e4ab09ec811c2a5691b49893c1009474f90";

const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);

const ports = [];

const AGGREGATE_INDEX = "5";
const INVALID_SUB_INDEX = "500";

const subscribedTickers = {};

subscribeToTickerOnWs("BTC", "USD");

self.onconnect = function (e) {
  ports.push(e.ports[0]);
  e.ports[0].addEventListener(
    "message",
    function (e) {
      switch (e.data.action) {
        case "subscribe": {
          const { ticker, currency } = e.data;

          if (currency === "BTC") {
            subscribeToTickerOnWs(ticker, currency);
            return;
          }
          if (subscribedTickers[ticker]) {
            subscribedTickers[ticker]++;
          } else {
            subscribedTickers[ticker] = 1;
            subscribeToTickerOnWs(ticker, currency);
          }
          console.table(subscribedTickers);

          // если добавляется тикер через btc, то в subscribedTickers добавляеться 2
          break;
        }
        case "unsubscribe": {
          const { ticker, currency } = e.data;
          if (subscribedTickers[ticker] == 1) {
            delete subscribedTickers[ticker];
            unsubscribeFromTickerOnWs(ticker, currency);
          } else {
            subscribedTickers[ticker]--;
          }
          console.table(subscribedTickers);

          break;
        }
      }
    },
    true
  );

  e.ports[0].start();

  // port.onmessage = function (e) {
  //   let workerResult = "Result: " + e.data;
  //   port.postMessage(workerResult);
  // };
};

socket.addEventListener("message", (e) => {
  for (var i = 0; i < ports.length; i++) {
    ports[i].postMessage(e.data);
  }
});

function sendToWebSocket(message) {
  const stringifiedMessage = JSON.stringify(message);
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(stringifiedMessage);
    return;
  }

  socket.addEventListener(
    "open",
    () => {
      socket.send(stringifiedMessage);
    },
    { once: true }
  );
}
function subscribeToTickerOnWs(ticker, currency = "USD") {
  sendToWebSocket({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~${currency}`],
  });
}
function unsubscribeFromTickerOnWs(ticker, currency = "USD") {
  if (ticker === "BTC" && currency === "USD") {
    return;
  }
  sendToWebSocket({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~${currency}`],
  });
}
