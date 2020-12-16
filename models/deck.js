class Deck {
  constructor() {
    this.cardQueue = []
  }

  shuffleDeck(cardList) {
    this.cardQueue = shuffleArray(cardList)
  }

  pop() {
    return this.cardQueue.shift()
  }

  push(card) {
    this.cardQueue.push(card)
  }
}

function shuffleArray(array) {
  array.sort(() => Math.random() - 0.5);
  return array
}

module.exports = { Deck, shuffleArray }
