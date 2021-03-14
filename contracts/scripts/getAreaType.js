const {ethers, deployments, getNamedAccounts} = require('@nomiclabs/buidler');
const {
  bfs,
  encodeDirections,
  decodeDirections,
  coordinatesInDirection,
  coordinatesToLocation,
} = require('../../backend/src/game/utils');

async function main() {
  const dungeon = await ethers.getContract('Dungeon');
  const readOnlyDungeon = await ethers.getContract('ReadOnlyDungeon');
  let location;
  let roomInfo;
  // let x;
  // let y;
  // let found = false;
  // for (x = -4; x <= 4; x++) {
  //   for (y = -22; y <= -14; y++) {
  //     location = coordinatesToLocation(`${x},${y},0`);
  //     roomInfo = await dungeon.callStatic.getRoomInfo(location);
  //     if (roomInfo.blockNumber.toNumber() != 0) {
  //       found = true;
  //     }
  //     if (found) {break;}
  //   }
  //   if (found) {break;}
  // }

  // if (roomInfo.blockNumber.toNumber() === 0) {
  //   console.error("could not find an discovered room")
  // }
  // console.log({location, x, y});

  location = coordinatesToLocation(`3,-15,0`);
  roomInfo = await dungeon.callStatic.getRoomInfo(location);

  const areaType = await dungeon.callStatic.getAreaTypeForRoom(location);
  const areaLoc = await readOnlyDungeon.callStatic.getAreaLoc(location);
  console.log({areaType, areaLoc});

  const blockNumber = roomInfo.blockNumber.toNumber();
  console.log({blockNumber});
  const block = await ethers.provider.getBlock(blockNumber);
  console.log({blockHash: block.hash});
  const generatedAreaType = await readOnlyDungeon.callStatic.generateArea(areaLoc, block.hash, 0);
  console.log({generatedAreaType});
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
