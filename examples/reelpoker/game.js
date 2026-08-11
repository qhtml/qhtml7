"use strict";

const REEL_COUNT = 5;
const CARDS_PER_REEL = 9;
const VISIBLE_SLOTS = 3;
const SLOT_HEIGHT = 100 / VISIBLE_SLOTS;
const SPIN_DURATION = 1600;
const WIN_LINE_DURATION = 2000;

const STARTING_CREDITS = 100;
const MIN_BET = 1;
const MAX_BET = 10;

const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14"];
const SUITS = ["D", "H", "C", "S"];

/*
 * Each payline contains one visible row number for each of the five reels.
 * 0 = top card, 1 = middle card, 2 = bottom card.
 */
const PAYLINES = [
  [0, 0, 0, 0, 0], //  1: top
  [1, 1, 1, 1, 1], //  2: middle
  [2, 2, 2, 2, 2], //  3: bottom
  [0, 1, 2, 1, 0], //  4: V
  [2, 1, 0, 1, 2], //  5: inverted V
  [0, 0, 1, 0, 0], //  6
  [2, 2, 1, 2, 2], //  7
  [1, 0, 0, 0, 1], //  8
  [1, 2, 2, 2, 1], //  9
  [0, 1, 1, 1, 0], // 10
  [2, 1, 1, 1, 2], // 11
  [0, 1, 0, 1, 0], // 12
  [2, 1, 2, 1, 2], // 13
  [1, 0, 1, 0, 1], // 14
  [1, 2, 1, 2, 1], // 15
  [0, 0, 2, 0, 0], // 16
  [2, 2, 0, 2, 2], // 17
  [0, 2, 0, 2, 0], // 18
  [2, 0, 2, 0, 2], // 19
  [1, 0, 2, 0, 1]  // 20
];

/* Simple poker-slot payout table. Payout = multiplier × current bet. */
const POKER_PAYOUTS = {
  ROYAL_FLUSH:    { name: "Royal Flush",    multiplier: 250 },
  STRAIGHT_FLUSH: { name: "Straight Flush", multiplier: 50 },
  FOUR_KIND:      { name: "Four of a Kind", multiplier: 25 },
  FULL_HOUSE:     { name: "Full House",     multiplier: 9 },
  FLUSH:          { name: "Flush",          multiplier: 6 },
  STRAIGHT:       { name: "Straight",       multiplier: 4 },
  THREE_KIND:     { name: "Three of a Kind",multiplier: 3 },
  TWO_PAIR:       { name: "Two Pair",       multiplier: 2 },
  PAIR:           { name: "Pair",           multiplier: 1 }
};

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function randomInteger(minimum, maximum) {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

class PokerCard {
  constructor(element, slotNumber) {
    this.element = element;
    this.image = element.querySelector(".rp-card-image");
    this.slotNumber = slotNumber;
    this.cardId = "";
  }

  setCard(cardId) {
    this.cardId = cardId;
    this.element.cardId = cardId;
    this.image.src = `cards/${cardId}.svg`;
    this.image.alt = cardId;
    return this;
  }

  moveTo(position) {
    this.element.style.top = `${(position - VISIBLE_SLOTS) * SLOT_HEIGHT}%`;
    return this;
  }
}

class Reel {
  constructor(element, cardIds) {
    this.element = element;
    this.number = Number(element.reelNumber || 0);
    this.cards = Array.from(element.querySelectorAll("card")).map((element, index) => {
      return new PokerCard(element, index).setCard(cardIds[index]);
    });

    this.layout();
  }

  card(cardNumber) {
    return this.cards[Number(cardNumber) - 1] || null;
  }

  slot(slotNumber) {
    const wantedSlot = Number(slotNumber) - 1;
    return this.cards.find((card) => card.slotNumber === wantedSlot) || null;
  }

  visibleSlot(slotNumber) {
    return this.slot(Number(slotNumber) + VISIBLE_SLOTS);
  }

  layout(offset = 0) {
    this.cards.forEach((card) => {
      const position = modulo(card.slotNumber + offset, CARDS_PER_REEL);
      card.moveTo(position);
    });
  }

  spin(advance, duration = SPIN_DURATION) {
    const startTime = performance.now();

    return new Promise((resolve) => {
      const animate = (time) => {
        const progress = Math.min(1, (time - startTime) / duration);
        this.layout(advance * easeInOutCubic(progress));

        if (progress < 1) {
          requestAnimationFrame(animate);
          return;
        }

        this.cards.forEach((card) => {
          card.slotNumber = modulo(card.slotNumber + advance, CARDS_PER_REEL);
        });

        this.layout();
        resolve();
      };

      requestAnimationFrame(animate);
    });
  }
}

class PokerHand {
  static evaluate(cardIds) {
    const ranks = cardIds.map((cardId) => Number(cardId.slice(0, -1)));
    const suits = cardIds.map((cardId) => cardId.slice(-1));
    const rankCounts = new Map();

    ranks.forEach((rank) => {
      rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1);
    });

    const uniqueRanks = Array.from(rankCounts.keys()).sort((a, b) => a - b);
    const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);
    const isFlush = suits.every((suit) => suit === suits[0]);
    const isAceLowStraight = uniqueRanks.join(",") === "2,3,4,5,14";
    const isNormalStraight = (
      uniqueRanks.length === 5
      && uniqueRanks[4] - uniqueRanks[0] === 4
    );
    const isStraight = isAceLowStraight || isNormalStraight;
    const isRoyal = isStraight && uniqueRanks[0] === 10 && uniqueRanks[4] === 14;

    if (isFlush && isRoyal) {
      return PokerHand.result(POKER_PAYOUTS.ROYAL_FLUSH, [0, 1, 2, 3, 4]);
    }
    if (isFlush && isStraight) {
      return PokerHand.result(POKER_PAYOUTS.STRAIGHT_FLUSH, [0, 1, 2, 3, 4]);
    }
    if (counts[0] === 4) {
      return PokerHand.result(POKER_PAYOUTS.FOUR_KIND, PokerHand.indexesWithCount(ranks, rankCounts, 4));
    }
    if (counts[0] === 3 && counts[1] === 2) {
      return PokerHand.result(POKER_PAYOUTS.FULL_HOUSE, [0, 1, 2, 3, 4]);
    }
    if (isFlush) {
      return PokerHand.result(POKER_PAYOUTS.FLUSH, [0, 1, 2, 3, 4]);
    }
    if (isStraight) {
      return PokerHand.result(POKER_PAYOUTS.STRAIGHT, [0, 1, 2, 3, 4]);
    }
    if (counts[0] === 3) {
      return PokerHand.result(POKER_PAYOUTS.THREE_KIND, PokerHand.indexesWithCount(ranks, rankCounts, 3));
    }
    if (counts[0] === 2 && counts[1] === 2) {
      return PokerHand.result(POKER_PAYOUTS.TWO_PAIR, PokerHand.indexesWithCount(ranks, rankCounts, 2));
    }
    if (counts[0] === 2) {
      return PokerHand.result(POKER_PAYOUTS.PAIR, PokerHand.indexesWithCount(ranks, rankCounts, 2));
    }

    return null;
  }

  static indexesWithCount(ranks, rankCounts, wantedCount) {
    const indexes = [];

    ranks.forEach((rank, index) => {
      if (rankCounts.get(rank) === wantedCount) {
        indexes.push(index);
      }
    });

    return indexes;
  }

  static result(payout, matchingIndexes) {
    return {
      name: payout.name,
      multiplier: payout.multiplier,
      matchingIndexes
    };
  }
}

class PokerGame {
  constructor(element) {
    this.element = element;
    this.reels = [];
    this.spinning = false;
    this.credits = STARTING_CREDITS;
    this.bet = MIN_BET;
    this.lastWin = 0;
    this.winAnimationTimer = 0;
    this.winningLines = [];
    this.currentWinningLine = 0;

    this.spinButton = element.querySelector(".rp-spin-control");
    this.betDecreaseButton = element.querySelector('rp-bet-button[modifyamount="-1"] .rp-bet-control')
      || element.querySelector(".rp-bet-decrease .rp-bet-control");
    this.betIncreaseButton = element.querySelector('rp-bet-button[modifyamount="1"] .rp-bet-control')
      || element.querySelector(".rp-bet-increase .rp-bet-control");

    this.creditsDisplay = element.querySelector(".rp-credits-value");
    this.betDisplay = element.querySelector(".rp-bet-value");
    this.winDisplay = element.querySelector(".rp-win-value");
    this.paylineButtons = Array.from(element.querySelectorAll(".rp-payline-control"));
  }

  start() {
    const deck = PokerGame.shuffledDeck();
    const reelElements = Array.from(this.element.querySelectorAll("reel"));

    this.reels = reelElements.map((element, index) => {
      const firstCard = index * CARDS_PER_REEL;
      return new Reel(element, deck.slice(firstCard, firstCard + CARDS_PER_REEL));
    });

    this.spinButton.addEventListener("click", () => this.spin());
    this.betDecreaseButton.addEventListener("click", () => this.changeBet(-1));
    this.betIncreaseButton.addEventListener("click", () => this.changeBet(1));

    this.updateDisplay();
    return this;
  }

  reel(reelNumber) {
    return this.reels[Number(reelNumber) - 1] || null;
  }

  changeBet(amount) {
    if (this.spinning) {
      return;
    }

    const nextBet = this.bet + Number(amount);
    if (nextBet < MIN_BET || nextBet > MAX_BET || nextBet > this.credits) {
      return;
    }

    this.bet = nextBet;
    this.updateDisplay();
  }

  async spin() {
    if (this.spinning || this.credits < this.bet) {
      return;
    }

    this.stopWinCelebration();
    this.spinning = true;
    this.credits -= this.bet;
    this.lastWin = 0;
    this.clearWinningPaylines();
    this.updateDisplay();

    await Promise.all(this.reels.map((reel, index) => {
      const fullRotations = CARDS_PER_REEL * 4;
      const stopOffset = randomInteger(1, CARDS_PER_REEL);
      return reel.spin(fullRotations + stopOffset, SPIN_DURATION + index * 100);
    }));

    const result = this.evaluatePaylines();
    this.lastWin = result.totalWin;
    this.credits += result.totalWin;
    this.spinning = false;
    this.showWinningPaylines(result.wins);
    this.startWinCelebration(result.wins);
    this.updateDisplay();

    return result;
  }

  evaluatePaylines() {
    const wins = [];
    let totalWin = 0;

    PAYLINES.forEach((rows, index) => {
      const cards = rows.map((row, reelIndex) => {
        return this.reels[reelIndex].visibleSlot(row + 1).cardId;
      });

      const hand = PokerHand.evaluate(cards);
      if (!hand) {
        return;
      }

      const payout = hand.multiplier * this.bet;
      totalWin += payout;
      wins.push({
        payline: index + 1,
        rows: rows.slice(),
        cards,
        hand: hand.name,
        multiplier: hand.multiplier,
        matchingIndexes: hand.matchingIndexes.slice(),
        payout
      });
    });

    return { totalWin, wins };
  }

  clearWinningPaylines() {
    this.paylineButtons.forEach((button) => {
      button.classList.remove("winning");
      button.removeAttribute("title");
    });
  }

  showWinningPaylines(wins) {
    wins.forEach((win) => {
      const button = this.paylineButtons[win.payline - 1];
      if (!button) {
        return;
      }

      button.classList.add("winning");
      button.title = `${win.hand}: ${win.multiplier}x = ${win.payout} credits`;
    });
  }

  stopWinCelebration() {
    if (this.winAnimationTimer) {
      clearTimeout(this.winAnimationTimer);
      this.winAnimationTimer = 0;
    }

    this.winningLines = [];
    this.currentWinningLine = 0;
    this.clearWinCardEffects();
  }

  startWinCelebration(wins) {
    this.stopWinCelebration();

    if (!wins.length) {
      return;
    }

    this.winningLines = wins.slice();
    this.currentWinningLine = 0;
    this.showNextWinningLine();
  }

  showNextWinningLine() {
    if (!this.winningLines.length || this.spinning) {
      return;
    }

    this.clearWinCardEffects();

    const win = this.winningLines[this.currentWinningLine];
    const lineCards = win.rows.map((row, reelIndex) => {
      return this.reels[reelIndex].visibleSlot(row + 1);
    });

    /* Force the CSS animation to restart when consecutive paylines share cards. */
    void this.element.offsetWidth;

    lineCards.forEach((card) => {
      card.element.classList.add("win-payline-card");
    });

    win.matchingIndexes.forEach((cardIndex) => {
      const card = lineCards[cardIndex];
      if (card) {
        card.element.classList.add("win-matching-card");
      }
    });

    const button = this.paylineButtons[win.payline - 1];
    if (button) {
      button.classList.add("current-winning");
    }

    this.currentWinningLine = (this.currentWinningLine + 1) % this.winningLines.length;
    this.winAnimationTimer = setTimeout(() => {
      this.showNextWinningLine();
    }, WIN_LINE_DURATION);
  }

  clearWinCardEffects() {
    this.element.querySelectorAll("card.win-payline-card, card.win-matching-card").forEach((card) => {
      card.classList.remove("win-payline-card", "win-matching-card");
    });

    this.paylineButtons.forEach((button) => {
      button.classList.remove("current-winning");
    });
  }

  updateDisplay() {
    this.creditsDisplay.textContent = String(this.credits);
    this.betDisplay.textContent = String(this.bet);
    this.winDisplay.textContent = String(this.lastWin);

    this.spinButton.disabled = this.spinning || this.credits < this.bet;
    this.betDecreaseButton.disabled = this.spinning || this.bet <= MIN_BET;
    this.betIncreaseButton.disabled = (
      this.spinning
      || this.bet >= MAX_BET
      || this.bet >= this.credits
    );
  }

  static shuffledDeck() {
    const deck = [];

    RANKS.forEach((rank) => {
      SUITS.forEach((suit) => deck.push(rank + suit));
    });

    for (let index = deck.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInteger(0, index);
      [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
    }

    return deck;
  }
}

function startPokerGame(frame = 0) {
  const gameElement = document.querySelector("rp-poker-slot-ui");

  if (
    gameElement
    && gameElement.querySelectorAll("reel").length === REEL_COUNT
    && gameElement.querySelectorAll("card").length === REEL_COUNT * CARDS_PER_REEL
    && gameElement.querySelector(".rp-spin-control")
    && gameElement.querySelector(".rp-bet-decrease .rp-bet-control")
    && gameElement.querySelector(".rp-bet-increase .rp-bet-control")
  ) {
    window.REEL_POKER_GAME = new PokerGame(gameElement).start();
    return;
  }

  if (frame < 120) {
    requestAnimationFrame(() => startPokerGame(frame + 1));
  }
}

document.addEventListener("QHTMLContentLoaded", () => startPokerGame(), { once: true });

window.ReelPoker = {
  PokerCard,
  Reel,
  PokerHand,
  PokerGame,
  PAYLINES,
  POKER_PAYOUTS
};
