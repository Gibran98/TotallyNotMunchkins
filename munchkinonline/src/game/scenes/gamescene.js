// import io from 'socket.io-client'
import Phaser from 'phaser'

import Board from '../classes/board'
import EndTurnButton from '../classes/endTurnButton'
import Opponent from '../classes/opponent'
import Player from '../classes/player'
import GameState from '../classes/gameState'


export default class GameScene extends Phaser.Scene {
    constructor() {
        super({
            key: 'GameScene'
        })
    }

    init(data) {
        this.socket = data.socket
        this.roomName = data.roomName
        this.playerList = data.playerList
    }

    preload() {
        /*======================IMAGE LOADING=======================*/
      const token_assets = ['tokenYellow', 'tokenBlue', 'tokenGreen', 'tokenRed']
        .map(color => [`${color}-male`, `${color}-female`]).flat()
        .map(value => [value, `${value}.png`]);
      const assets = [
        ['cardBack', 'cardBack.jpg'], ['doorCard', 'cardBack.jpg'], ['treasureCard', 'treasure.jpg'],
        ['pogmin', 'Pogmin.jpg'], ['doorDeck', 'deck.png'], ['treasureDeck', 'deck.png'],
        ['doorDiscard', 'discard.png'], ['treasureDiscard', 'discard.png'], ['slotBG', 'slotBG.png'],
        ['playButton', 'playButton.png'], ['endTurn', 'endTurn.png'], ['goUpALevel', 'goUpALevel.jpg'],
      ].concat(token_assets);

      assets.forEach(asset => {
        const name, filename = asset;
        this.load.image(name, `assets/${filename}`);
      });

      this.load.image('playButton', 'assets/playButton.png')
      this.load.image('endTurn', 'assets/endTurn.png')
      this.load.image('goUpALevel', 'assets/goUpALevel.jpg')
      /*======================OTHER DATA LOADING=======================*/
      this.load.json('cards', 'data/cards.json')
    }

    create() {
        /*======================INITIAL SOCKET SETUP=======================*/


        /*======================SCENE COMPONENTS CREATION=======================*/

        // Add cards object list
        this.cardList = this.cache.json.get('cards').cards

        const positions = ['left', 'top', 'right']

        const screenWidth = this.scale.width
        const screenHeight = this.scale.height

        const hWidth = screenWidth * (2/3)
        const hHeight = screenHeight / 6

        const vWidth = screenWidth / 12
        const vHeight = screenHeight * (2/3)

        const cardWidth = 50
        const cardHeight = 72.5

        const offset = 10

        // Create game state
        this.gameState = new GameState(this)

        // Create player and render its hand
        this.player = new Player(this)
        this.player.renderHand(hWidth, hHeight, cardWidth, cardHeight, offset)

        // Create opponents and render their hands
        this.opponents = []
        this.playerList.forEach(player => {
            if (player.socketId != this.socket.id) {
                this.opponents.push(new Opponent(this, positions.shift(), player.socketId, player.gender))
            }
        })

        this.opponents.forEach(opponent => {
            opponent.renderHand(hWidth, hHeight, vWidth, vHeight, cardWidth, cardHeight, offset)
        })

        // Create and render the board
        let startTile = this.createBoard(hWidth, vHeight)

        // Render the player's and opponents tokens
        this.playerList.forEach((player, index)=> {
            if (player.socketId == this.socket.id) {
                this.player.gender = player.gender
                this.player.renderToken(startTile, index, player.tokenImage)
                this.player.chooseColor(player.tokenImage)

            } else {
                this.opponents.forEach(opponent => {
                    if (opponent.socketId == player.socketId) {
                        opponent.renderToken(startTile, index, player.tokenImage)
                        opponent.chooseColor(player.tokenImage)
                    }
                })
            }
        })

        // Render new game image and add click event
        let playButton = this.add.image(0, 0, 'playButton').setInteractive({ cursor: 'pointer' })

        playButton.on('pointerup', () => {
            this.scene.start('Lobby', {socket: this.socket})
        })

        // Render current turn text
        this.currentTurnText = this.add.text(screenWidth/22, screenHeight/20, "Pregame", {fontFamily: 'Avenir, Helvetica, Arial, sans-serif'}).setFontSize(24).setColor('#000')

        // Render endTurnBUtton
        this.endTurnButton = new EndTurnButton(this)
        this.endTurnButton.render(screenWidth, this.player.playerHand.dimensions.y + this.player.playerHand.dimensions.height/2)

        // Request initial cards
        this.socket.emit('distributeCards', this.roomName)

        /*======================INPUT EVENTS=======================*/
        this.input.on('drag', function (pointer, gameObject, dragX, dragY) {
            gameObject.x = dragX;
            gameObject.y = dragY;
        })

        this.input.on('dragstart', function (pointer, gameObject) {
            this.children.bringToTop(gameObject);
        }, this)

        this.input.on('drop', function (pointer, gameObject, dropZone) {

            // Card on Player Hand
            if (gameObject.data.get('type') === 'card' && dropZone.data.get('type') === 'hand') {

                updateLastPosition(gameObject)

            // Token on Tile
            } else if (gameObject.data.get('type') === 'token' && dropZone.data.get('type') === 'tile') {

                if (gameObject.data.get('level') == dropZone.data.get('level')) {
                    updateLastPosition(gameObject)
                    this.scene.socket.emit('moveToken', this.scene.roomName, gameObject.x, gameObject.y)

                    if (gameObject.data.get('level') == 10) {
                        this.scene.socket.emit('winGame', this.scene.roomName)
                    }
                } else {
                    returnToLastPosition(gameObject)
                }

            // Card on Discard
            } else if (gameObject.data.get('type') === 'card' && dropZone.data.get('type') === 'discard') {
                if (gameObject.data.get('deck') === dropZone.data.get('deck')) {

                    this.scene.removeCardFromPlayer(gameObject)

                } else {
                    returnToLastPosition(gameObject)
                }

            // Card on Equipment Slot
            } else if (gameObject.data.get('type') === 'card' && dropZone.data.get('type') === 'slot') {
                // Later check for equipment type compatibility
                gameObject.x = dropZone.x
                gameObject.y = dropZone.y

                updateLastPosition(gameObject)

            // Card on Tile (use card on self)
            } else if (gameObject.data.get('type') === 'card' && dropZone.data.get('type') === 'tile') {

                if (this.scene.useCard(gameObject.data.get('data'), this.scene.socket.id)) {
                    this.scene.removeCardFromPlayer(gameObject)
                } else {
                    returnToLastPosition(gameObject)
                }

            // Card on Opponent Hand (use card on opponent)
            } else if (gameObject.data.get('type') === 'card' && dropZone.data.get('type') === 'opponentHand') {

                if (this.scene.useCard(gameObject.data.get('data'), dropZone.data.get('ownerId'))) {
                    this.scene.removeCardFromPlayer(gameObject)
                } else {
                    returnToLastPosition(gameObject)
                }

            } else {
                returnToLastPosition(gameObject)
            }
        });

        this.input.on('dragend', function (pointer, gameObject, dropped) {
            if (!dropped) {
                returnToLastPosition(gameObject)
            }
        });

        /*
        this.input.on('dragenter', function (pointer, gameObject, dropZone) {

            //dropZone.setTint(0x00ff00);

        });
        */

        this.input.on('dragleave', function (pointer, gameObject, dropZone) {
            if (gameObject.data.get('type') === 'card' && dropZone.data.get('type') === 'hand') {
                updateLastPosition(gameObject)
            }
            else if (gameObject.data.get('type') === 'token' && dropZone.data.get('type') === 'tile') {
                if (gameObject.data.get('level') == dropZone.data.get('level')) {
                    updateLastPosition(gameObject)
                }
            } else {
                // Ignore incompatible dropzone; do nothing
            }
        });

        /*======================SOCKET EVENTS=======================*/
        this.socket.on('moveOpponentToken', (socketId, x, y) => {
            this.opponents.forEach(opponent => {
                if (opponent.socketId == socketId) {
                    opponent.moveToken(x, y)
                }
            })
        })

        this.socket.on('addCardsToPlayer', (cardNames, cardType) => {
            let cardList = this.getCards(cardNames, cardType)
            cardList.forEach((card, index) => {
                this.player.addToHand(card, index)
            })
        })

        this.socket.on('distributeCards', (treasureNames, doorNames) => {
            let treasureCards = this.getCards(treasureNames, 'treasure')
            let doorCards = this.getCards(doorNames, 'door')
            let allCards = treasureCards.concat(doorCards)
            allCards.forEach((card, index) => {
                this.player.addToHand(card, index)
            })
        })

        this.socket.on('updateOpponentCards', (socketId, cards) => {
            this.opponents.forEach(opponent => {
                if (opponent.socketId == socketId) {
                    opponent.updateCards(cards)
                }
            })
        })

        this.socket.on('updateLevel', (socketId, level) => {
            if (socketId == this.socket.id) {
                this.player.updateLevel(level)
            } else {
                this.opponents.forEach(opponent => {
                    if (opponent.socketId == socketId) {
                        opponent.updateLevel(level)
                    }
                })
            }
        })

        this.socket.on('endPregame', () => {
            this.gameState.endPregame()
        })

        this.socket.on('changeTurn', (socketId) => {
            this.gameState.changeTurn(socketId)

            let color = null
            if (socketId == this.socket.id) {
                color = this.player.colorString
            } else {
                this.opponents.forEach(opponent => {
                    if (opponent.socketId == socketId) {
                        color = opponent.colorString
                    }
                })
            }

            this.currentTurnText.text = `${socketId}'s turn`
            this.currentTurnText.setColor(color)
        })

        this.socket.on('drewCard', () => {
            this.gameState.drewCard()
        })

        this.socket.on('endGame', (socketId) => {
            let color = null
            if (socketId == this.socket.id) {
                color = this.player.colorString
            } else {
                this.opponents.forEach(opponent => {
                    if (opponent.socketId == socketId) {
                        color = opponent.colorString
                    }
                })
            }

            this.currentTurnText.text = `${socketId} WIINNSSS`
            this.currentTurnText.setColor(color)
            this.gameState.finishGame()
        })

    }

    update() {

    }

    /*======================UI CREATION FUNCTIONS=======================*/
    createBoard(hWidth, vHeight) {
        const numRows = 3
        const numCols = 5

        this.board = new Board(this, this.player.playerHand.dimensions.x, this.opponents[0].opponentHand.dimensions.y, hWidth/numCols, vHeight/numRows)
        this.board.renderTiles()
        this.board.renderDecks()
        this.board.renderDiscards()

        return {
            x: this.board.dimensions.x + this.board.tiles[0].col * this.board.dimensions.cellWidth,
            y: this.board.dimensions.y + this.board.tiles[0].row * this.board.dimensions.cellHeight,
            width: this.board.dimensions.cellWidth,
            height: this.board.dimensions.cellHeight
        }
    }

    /*======================OBJECT SEARCH FUNCTIONS=======================*/
    getCards(cardNames, cardType) {
        let cards = []
        for (let i = 0; i < cardNames.length; i++) {
            if (cardType === 'door') {
                for (let j = 0; j < this.cardList.doors.length; j++) {
                    if (cardNames[i] == this.cardList.doors[j].name) {
                        cards.push(this.cardList.doors[j])
                    }
                }
            } else {
                for (let j = 0; j < this.cardList.treasures.length; j++) {
                    if (cardNames[i] == this.cardList.treasures[j].name) {
                        cards.push(this.cardList.treasures[j])
                    }
                }
            }
        }
        return cards
    }

    findCard(card) {
        for (let i = 0; i < this.player.cards.length; i++) {
            if (card == this.player.cards[i]) {
                return i
            }
        }
        return -1
    }

    removeCardFromPlayer(cardGameObject) {
        let index = this.findCard(cardGameObject.data.get('data'))
        this.player.removeCardAt(index)

        this.socket.emit('removeCard', this.roomName, cardGameObject.data.get('data').name, cardGameObject.data.get('deck'), index)

        cardGameObject.destroy()
    }

    useCard(card, targetId) {
        if (this.gameState.inPregame) {
            alert("You can't use cards right now.")
            return false
        }

        if (card.type === "curse" || card.type === "item") {
            if (targetId == this.socket.id) {
                return this.useCardEffect(card, this.player)
            } else {
                this.opponents.forEach(opponent => {
                    if (opponent.socketId == targetId) {
                        return this.useCardEffect(card, opponent)
                    }
                })
            }
        } else {
            return false
        }

        return true
    }

    /*======================CARD EFFECTS=======================*/
    useCardEffect(card, target) {

        switch(card.name) {
            case "Go Up A Level":
                target.levelUp(1)
                return true
            default:
                console.log("Error: unexpected card name")
                return false
        }

    }

}

/*======================DRAG EVENT HELPER FUNCTIONS=======================*/
function updateLastPosition(gameObject) {
    gameObject.data.set('lastX', gameObject.x)
    gameObject.data.set('lastY', gameObject.y)
}

function returnToLastPosition(gameObject) {
    if (gameObject.data.get('lastX') == null && gameObject.data.get('lastY') == null) {
        gameObject.x = gameObject.input.dragStartX
        gameObject.y = gameObject.input.dragStartY
    } else {
        gameObject.x = gameObject.data.get('lastX')
        gameObject.y = gameObject.data.get('lastY')
    }
}
