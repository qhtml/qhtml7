const PAYLINE_DATA = Object.freeze([
  Object.freeze([2, 2, 2, 2, 2]),
  Object.freeze([1, 1, 1, 1, 1]),
  Object.freeze([3, 3, 3, 3, 3]),
  Object.freeze([3, 3, 3, 3, 2]),
  Object.freeze([3, 3, 2, 2, 3]),
  Object.freeze([3, 2, 3, 2, 1]),
  Object.freeze([3, 2, 1, 1, 2]),
  Object.freeze([3, 1, 2, 1, 1]),
  Object.freeze([3, 1, 1, 3, 3]),
  Object.freeze([2, 3, 3, 1, 1]),
  Object.freeze([2, 3, 1, 2, 2]),
  Object.freeze([2, 2, 2, 1, 3]),
  Object.freeze([2, 2, 1, 3, 1]),
  Object.freeze([2, 1, 3, 2, 3]),
  Object.freeze([2, 1, 2, 3, 2]),
  Object.freeze([1, 3, 2, 3, 1]),
  Object.freeze([1, 3, 1, 1, 3]),
  Object.freeze([1, 2, 3, 3, 3]),
  Object.freeze([1, 2, 2, 2, 2]),
  Object.freeze([1, 1, 3, 1, 2]),
]);

const CARD_RANKS = Object.freeze(["2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14"]);
const CARD_SUITS = Object.freeze(["D", "H", "C", "S"]);
const REEL_COUNT = 5;
const CARDS_PER_REEL = 9;
const MAX_RENDER_WAIT_FRAMES = 60;
const SPIN_ROTATIONS = 4;
const SPIN_DURATION_MS = 4000;

function createDeck() {
  return CARD_RANKS.flatMap(function(rank) {
    return CARD_SUITS.map(function(suit) {
      const id = rank + suit;
      return {
        id: id,
        rank: rank,
        suit: suit,
        src: "cards/" + id + ".svg",
      };
    });
  });
}

function shuffleCards(cards) {
  const shuffled = cards.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }
  return shuffled;
}

function init() {
  const cards = shuffleCards(createDeck()).slice(0, REEL_COUNT * CARDS_PER_REEL);
  const reels = [];
  for (let reelIndex = 0; reelIndex < REEL_COUNT; reelIndex += 1) {
    const start = reelIndex * CARDS_PER_REEL;
    reels.push(cards.slice(start, start + CARDS_PER_REEL));
  }

  const state = {
    reels: reels,
    cards: cards,
  };

  globalThis.REEL_POKER_STATE = state;
  globalThis.REEL_DATA = reels;
  if (typeof document !== "undefined") {
    renderReels(state);
  }
  return state;
}

function gameRootElement() {
  const root = document.querySelector("rp-poker-slot-ui");
  if (!root) {
    throw new Error("Missing Reel Poker root component");
  }
  return root;
}

function reelElements() {
  return Array.from(document.querySelectorAll("reel")).sort(function(first, second) {
    return Number(first.reelNumber) - Number(second.reelNumber);
  });
}

function updateReelCards(reelNumber) {
  gameRootElement().updateReelCards(reelNumber);
}

function renderReels(state) {
  gameRootElement().loadReelPokerState(state);
}

function rotateReelStateDown(reelIndex) {
  const reel = globalThis.REEL_DATA[reelIndex];
  reel.unshift(reel.pop());
}

function finishReelStep(reelElement, spinToken) {
  const reelNumber = Number(reelElement.reelNumber);
  rotateReelStateDown(reelNumber - 1);
  updateReelCards(reelNumber);
  reelElement.reelStepCompleted(reelNumber, spinToken);
}

function applySpinStepComplete() {
  return true;
}

function finalizeSpinRender() {
  gameRootElement().layoutAllReels();
}

globalThis.PAYLINE_DATA = PAYLINE_DATA;
globalThis.init = init;
globalThis.REEL_POKER_GAME = {
  createDeck: createDeck,
  shuffleCards: shuffleCards,
  init: init,
  renderReels: renderReels,
  updateReelCards: updateReelCards,
  rotateReelStateDown: rotateReelStateDown,
  finishReelStep: finishReelStep,
  applySpinStepComplete: applySpinStepComplete,
  finalizeSpinRender: finalizeSpinRender,
};

function hasReelDom() {
  return document.querySelectorAll("reel").length === REEL_COUNT;
}

function hasCardDom() {
  return document.querySelectorAll("rpcard").length === REEL_COUNT * CARDS_PER_REEL;
}

function hasSpinButtonDom() {
  return Boolean(document.querySelector(".rp-spin-control"));
}

function initWhenReelsReady(frameCount) {
  if (hasReelDom() && hasCardDom() && hasSpinButtonDom()) {
    init();
    return;
  }

  if (frameCount >= MAX_RENDER_WAIT_FRAMES) {
    throw new Error("Reel Poker reel DOM was not created before init()");
  }

  requestAnimationFrame(function waitForReelDom() {
    initWhenReelsReady(frameCount + 1);
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("QHTMLContentLoaded", function handleReelPokerContentLoaded() {
    initWhenReelsReady(0);
  }, { once: true });
}

if (typeof module !== "undefined") {
  module.exports = {
    PAYLINE_DATA,
    CARD_RANKS,
    CARD_SUITS,
    REEL_COUNT,
    CARDS_PER_REEL,
    MAX_RENDER_WAIT_FRAMES,
    SPIN_ROTATIONS,
    SPIN_DURATION_MS,
    createDeck,
    shuffleCards,
    init,
    renderReels,
    reelElements,
    updateReelCards,
    rotateReelStateDown,
    finishReelStep,
    applySpinStepComplete,
    finalizeSpinRender,
    hasReelDom,
    hasCardDom,
    hasSpinButtonDom,
    initWhenReelsReady,
  };
}
