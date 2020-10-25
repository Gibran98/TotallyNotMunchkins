const {Player} = require('./player.js')
const {Deck} = require('./deck.js')

class Room {
    constructor(name, hostId, connectionCount) {
        this.name = name
        this.hostId = hostId
        this.players = []
        this.availableTokens = ["tokenRed", "tokenBlue", "tokenGreen", "tokenYellow"]
        this.treasureDeck = new Deck()
        this.doorDeck = new Deck()
    
        this.addPlayer = (socketId) => {
            this.players.push(new Player(socketId))
        }
        
        this.getInfo = () => {
            return this.players.map(player => {
                return {
                    socketId: player.getSocketId(),
                    tokenImage: player.getTokenImage(),
                    gender: player.getGender()
                }
            })
        }

        this.shuffleDecks = (treasures, doors) => {
            this.treasureDeck.shuffleDeck(treasures)
            this.doorDeck.shuffleDeck(doors)
        }
    }
}

module.exports = { Room }
