const { coordinatesAt } = require('../game/utils');

const drawMap = (rooms, coordinates = '0,0', radius = 5) => {
  let map = '';
  for (let y = -radius; y <= +radius; y += 1) {
    const row = ['', '', ''];
    for (let x = -radius; x <= +radius; x += 1) {
      const room = rooms[coordinatesAt(coordinates, x, y)];
      if (room && room.allExits) {
        row[0] += room.allExits.north ? '┌─╨─┐' : '┌───┐';
        row[1] += room.allExits.west ? '╡' : '│';
        if (room.status === 'discovered') {
          row[1] += ' ? ';
        } else if (room.characters && room.characters.length > 0) {
          row[1] += ` ${room.characters.length} `;
        } else {
          row[1] += '   ';
        }
        row[1] += room.allExits.east ? '╞' : '│';
        row[2] += room.allExits.south ? '└─╥─┘' : '└───┘';
      } else {
        row[0] += '     ';
        row[1] += '  ·  ';
        row[2] += '     ';
      }
    }
    map += `${row[0]}\n`;
    map += `${row[1]}\n`;
    map += `${row[2]}\n`;
  }
  return map;
};

module.exports = drawMap;
