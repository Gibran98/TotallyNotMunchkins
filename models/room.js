const {Player} = require('./player.js')
const {Deck, shuffleArray} = require('./deck.js')

class Room {
  constructor(name, hostId, _connectionCount) {
    this.name = name
    this.hostId = hostId
    this.players = []
    this.availableTokens = ["tokenRed", "tokenBlue", "tokenGreen", "tokenYellow"]
    this.treasureDeck = new Deck()
    this.doorDeck = new Deck()

    this.turnIndex = 0
  }

  addPlayer(socketId) {
    this.players.push(new Player(socketId));
  }

  getInfo() {
    return this.players.map((player) => player.getInfo());
  }

  shuffleDecks(treasures, doors) {
    this.treasureDeck.shuffleDeck(treasures);
    this.doorDeck.shuffleDeck(doors);
  }

  shufflePlayers() {
    this.players = shuffleArray(this.players);
  }

  getNextPlayerId() {
    this.turnIndex += 1;
    const nextPlayerIndex = this.turnIndex % this.players.length;
    return this.players[nextPlayerIndex].socketId;
  }
}

module.exports = { Room }
