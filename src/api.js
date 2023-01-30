const API_KEY =
  "cd5b86bccf5299f9fda2de5f829a8e4ab09ec811c2a5691b49893c1009474f90";

const tickersHandlers = new Map();
const AGGREGATE_INDEX = "5";
const INVALID_SUB_INDEX = "500";

const isSharedWorkerSupported = window.SharedWorker;

let PriceBTC;
let socket;
let worker;
if (isSharedWorkerSupported) {
  worker = new SharedWorker("sharedWorker.js");
  worker.port.onmessage = function (e) {
    handleWebSocketResponse(e.data);
  };
} else {
  socket = new WebSocket(
    `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
  );
  subscribeToTickerOnWs("BTC", "USD");
  socket.addEventListener("message", (e) => {
    handleWebSocketResponse(e.data);
  });
}

function convertToBTC(priceInBTC) {
  return priceInBTC * PriceBTC;
}

function handleWebSocketResponse(data) {
  const {
    TYPE: type,
    FROMSYMBOL: ticker,
    TOSYMBOL: currency,
    PRICE: newPrice,
  } = JSON.parse(data);
  let isInvalidSub = false;
  if (type === AGGREGATE_INDEX && newPrice != undefined) {
    if (ticker === "BTC") {
      PriceBTC = newPrice;
    }
    if (currency === "BTC") {
      const handlers = tickersHandlers.get(ticker) ?? [];
      console.log(ticker);
      handlers.forEach((fn) => fn(convertToBTC(newPrice), isInvalidSub));
      return;
    }
    const handlers = tickersHandlers.get(ticker) ?? [];
    handlers.forEach((fn) => fn(newPrice, isInvalidSub));
  }
  if (type === INVALID_SUB_INDEX) {
    const { PARAMETER: param, MESSAGE: message } = JSON.parse(data);
    if (message === "SUBSCRIPTION_ALREADY_ACTIVE") {
      return;
    }
    for (let subName of tickersHandlers.keys()) {
      if (param.includes("~" + subName + "~")) {
        if (param.includes("USD", param.indexOf(subName) + subName.length)) {
          if (subName === "BTC") {
            return;
          }
          if (isSharedWorkerSupported) {
            worker.port.postMessage({
              action: "subscribe",
              ticker: subName,
              currency: "BTC",
            });
            return;
          } else {
            sendToWebSocket({
              action: "SubAdd",
              subs: [`5~CCCAGG~${subName}~BTC`],
            });
            return;
          }
        } else if (
          param.includes("BTC", param.indexOf(subName) + subName.length)
        ) {
          isInvalidSub = true;
          const invalidSubHandler = tickersHandlers.get(subName) ?? [];
          invalidSubHandler.forEach((fn) => fn(null, isInvalidSub));
        }
      }
    }
  }
}

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

export const subscribeToTicker = (ticker, cb, currency = "USD") => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
  if (isSharedWorkerSupported) {
    worker.port.postMessage({
      action: "subscribe",
      ticker: ticker,
      currency: currency,
    });
  } else {
    subscribeToTickerOnWs(ticker, currency);
  }
};

export const unsubscribeFromTicker = (ticker, currency = "USD") => {
  tickersHandlers.delete(ticker);
  if (isSharedWorkerSupported) {
    worker.port.postMessage({
      action: "unsubscribe",
      ticker: ticker,
      currency: currency,
    });
  } else {
    unsubscribeFromTickerOnWs(ticker, currency);
  }
};

window.onbeforeunload = function () {
  for (let ticker of tickersHandlers.keys()) {
    unsubscribeFromTicker(ticker);
  }
};
