<template>
  <section>
    <div class="flex">
      <div class="max-w-xs">
        <label for="wallet" class="block text-sm font-medium text-gray-700"
          >Тикер</label
        >
        <div class="mt-1 relative rounded-md shadow-md">
          <input
            v-model.trim="ticker"
            @keydown.enter="add()"
            type="text"
            name="wallet"
            id="wallet"
            @input="clearTickerErrors"
            class="block w-full pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
            placeholder="Например DOGE"
          />
        </div>
        <div
          v-if="hints.length"
          class="flex bg-white shadow-md p-1 rounded-md shadow-md flex-wrap"
        >
          <span
            v-for="hint in hints"
            @click="(ticker = hint), add()"
            :key="hint"
            class="inline-flex items-center px-2 m-1 rounded-md text-xs font-medium bg-gray-300 text-gray-800 cursor-pointer"
          >
            {{ hint }}
          </span>
        </div>
        <div v-if="tickerErrors.duplicateError" class="text-sm text-red-600">
          Такой тикер уже добавлен
        </div>
        <div v-if="tickerErrors.emptyTickerError" class="text-sm text-red-600">
          Пустой тикер
        </div>
        <div v-if="!isCoinListLoaded" class="text-sm text-red-600">
          Не удалось загрузить список тикеров
        </div>
      </div>
    </div>
    <add-button
      @click="
        clearTickerErrors();
        add();
      "
      :disabled="disabled"
      type="button"
    />
  </section>
</template>
<script>
import AddButton from "./AddButton.vue";
import { loadCoins } from "../loadCoins";

export default {
  components: { AddButton },
  props: {
    disabled: {
      type: Boolean,
      required: false,
      default: false,
    },
    tickerErrors: {
      type: Object,
      required: false,
      default() {
        return { duplicateError: false, emptyTickerError: false };
      },
    },
  },
  emits: {
    "add-ticker": null,
    "clear-ticker-errors": null,
    "got-coin-list-responce": null,
  },
  data() {
    return {
      ticker: "",

      coinList: null,
      isCoinListLoaded: true,

      hints: [],
    };
  },
  async mounted() {
    // можливо дописати стан для незавантаженого списку(помилку, з прибраним лоадером)
    const coinData = await loadCoins();
    this.coinList = coinData.Data;
    this.$emit("got-coin-list-responce");
    if (coinData.Response !== "Success") {
      this.isCoinListLoaded = false;
    }
  },

  methods: {
    add() {
      this.$emit("add-ticker", this.ticker);
      this.ticker = "";
    },
    clearTickerErrors() {
      if (this.tickerHasError) {
        this.$emit("clear-ticker-errors");
      }
    },
    showHints() {
      this.hints = [];
      if (this.ticker) {
        const re = RegExp(this.ticker, "i");
        for (let coin in this.coinList) {
          const coinItem = this.coinList[coin];
          if (~coinItem.FullName.search(re)) {
            this.hints.push(coinItem.Symbol);
          }
          if (this.hints.length > 3) {
            break;
          }
        }
      }
    },
  },
  computed: {
    tickerHasError() {
      for (let error in this.tickerErrors) {
        if (this.tickerErrors[error] === true) {
          return true;
        }
      }
      return false;
    },
  },
  watch: {
    ticker() {
      this.showHints();
    },
  },
};
</script>
