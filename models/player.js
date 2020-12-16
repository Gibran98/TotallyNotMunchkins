class Player {
  constructor(socketId) {
    this.socketId = socketId
    this.cards = []
    this.level = 1
    this.equipment = []
    this.gender = ""
    this.power = 1
    this.tokenImage = ""
    this.inPregame = true

  }

  getInfo() {
    const { gender, socketId, tokenImage } = this;
    return { gender, socketId, tokenImage };
  }

  removeCardAt(index) {
    this.cards.splice(index, 1);
  }
}

module.exports = { Player }
