const arrayMultiplier = (arr, times) => {
  const origArr = [...arr];
  for(let i = 0; i < times; i++) {
    arr.concat(origArr);
  }
  return arr;
}

const TreasureList = arrayMultiplier(['Diamond Sword', 'Go Up A Level'], 13);
const DoorList = arrayMultiplier(
  ['Pogmin', 'Unpogmin', 'Warrior', 'Elf', 'Duck of Doom'], 8,
);

module.exports = { TreasureList, DoorList }
