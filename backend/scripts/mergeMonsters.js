/**
 * MERGE NEW MONSTERS LIST INTO LEVEL-BASED GEAR ITEMS
 *
 * >> YOU WILL NEED TO COPY/PASTE THE CONSOLE OUTPUT AND REPLACE IN src/data/monsters.js <<
 *
 * REGEXP FIND/REPLACE
 * ^(\d+)	([\w\d .-]+)	([\w\d .-]{0,})	(\d+)	(\d+)	(\d+)	(\d+)	(\d+)	([\w\d.-]+)
 * { id: $1, name: "$2", type: "$3", stats: { health: $4, attack: $5, defense: $6, protection: $7, level: $8, wealthLevel: $8}, attacks: [], defenses: [], image: "$9" },
 */
const deepmerge = require('deepmerge');
const oldMonsters = require('../src/data/monsters');

// HOW MANY LEVELS TO CREATE
const MAX_LEVELS = 8;

const newMonsters = [
  { id: 1, name: "Ork", type: "Trash", stats: { health: 5, attack: 0, defense: 0, protection: 0, level: 0, wealthLevel: 0}, attacks: [], defenses: [], image: "mon0003.png" },
  { id: 2, name: "Skeleton", type: "Trash", stats: { health: 5, attack: 0, defense: 0, protection: 0, level: 0, wealthLevel: 0}, attacks: [], defenses: [], image: "mon0000.png" },
  { id: 14, name: "Skeleton", type: "Trash", stats: { health: 10, attack: 0, defense: 0, protection: 0, level: 1, wealthLevel: 1}, attacks: [], defenses: [], image: "mon0000.png" },
  { id: 4, name: "Snake Pit", type: "Trash", stats: { health: 10, attack: 0, defense: 0, protection: 0, level: 1, wealthLevel: 1}, attacks: [], defenses: [], image: "mon0002.png" },
  { id: 3, name: "Killer Dust Bunny", type: "Mini boss", stats: { health: 20, attack: 0, defense: 0, protection: 0, level: 1, wealthLevel: 1}, attacks: [], defenses: [], image: "mon0005.png" },
  { id: 15, name: "Snake Pit", type: "Trash", stats: { health: 15, attack: 0, defense: 0, protection: 0, level: 2, wealthLevel: 2}, attacks: [], defenses: [], image: "mon0002.png" },
  { id: 16, name: "Ork", type: "Trash", stats: { health: 15, attack: 0, defense: 0, protection: 0, level: 2, wealthLevel: 2}, attacks: [], defenses: [], image: "mon0003.png" },
  { id: 17, name: "Skeleton", type: "Trash", stats: { health: 15, attack: 0, defense: 0, protection: 0, level: 2, wealthLevel: 2}, attacks: [], defenses: [], image: "mon0000.png" },
  { id: 5, name: "Hime Fungai", type: "Mini boss", stats: { health: 25, attack: 0, defense: 0, protection: 0, level: 2, wealthLevel: 2}, attacks: [], defenses: [], image: "mon0004.png" },
  { id: 18, name: "Snake Pit", type: "Trash", stats: { health: 25, attack: 0, defense: 0, protection: 0, level: 3, wealthLevel: 3}, attacks: [], defenses: [], image: "mon0002.png" },
  { id: 19, name: "Killer Dust Bunny", type: "Trash", stats: { health: 20, attack: 0, defense: 0, protection: 0, level: 3, wealthLevel: 3}, attacks: [], defenses: [], image: "mon0005.png" },
  { id: 20, name: "Ork", type: "Trash", stats: { health: 20, attack: 0, defense: 0, protection: 0, level: 3, wealthLevel: 3}, attacks: [], defenses: [], image: "mon0003.png" },
  { id: 6, name: "Djinn", type: "Mini boss", stats: { health: 35, attack: 0, defense: 0, protection: 0, level: 3, wealthLevel: 3}, attacks: [], defenses: [], image: "mon0001.png" },
  { id: 21, name: "Ork", type: "Trash", stats: { health: 30, attack: 0, defense: 0, protection: 0, level: 4, wealthLevel: 4}, attacks: [], defenses: [], image: "mon0003.png" },
  { id: 22, name: "Killer Dust Bunny", type: "Trash", stats: { health: 30, attack: 0, defense: 0, protection: 0, level: 4, wealthLevel: 4}, attacks: [], defenses: [], image: "mon0005.png" },
  { id: 10, name: "Angry Skeleton", type: "Trash", stats: { health: 35, attack: 0, defense: 0, protection: 0, level: 4, wealthLevel: 4}, attacks: [], defenses: [], image: "mon0000.png" },
  { id: 23, name: "Snake Pit", type: "Trash", stats: { health: 35, attack: 0, defense: 0, protection: 0, level: 4, wealthLevel: 4}, attacks: [], defenses: [], image: "mon0002.png" },
  { id: 7, name: "Killer Hime Fungai", type: "Mini boss", stats: { health: 45, attack: 0, defense: 0, protection: 0, level: 4, wealthLevel: 4}, attacks: [], defenses: [], image: "mon0004.png" },
  { id: 8, name: "Angry Djinn", type: "Mini boss", stats: { health: 45, attack: 0, defense: 0, protection: 0, level: 4, wealthLevel: 4}, attacks: [], defenses: [], image: "mon0001.png" },
  { id: 9, name: "Killer Ork", type: "Trash", stats: { health: 40, attack: 0, defense: 0, protection: 0, level: 5, wealthLevel: 5}, attacks: [], defenses: [], image: "mon0003.png" },
  { id: 24, name: "Angry Skeleton", type: "Trash", stats: { health: 40, attack: 0, defense: 0, protection: 0, level: 5, wealthLevel: 5}, attacks: [], defenses: [], image: "mon0000.png" },
  { id: 25, name: "Djinn", type: "Trash", stats: { health: 40, attack: 0, defense: 0, protection: 0, level: 5, wealthLevel: 5}, attacks: [], defenses: [], image: "mon0001.png" },
  { id: 26, name: "Hime Fungai", type: "Trash", stats: { health: 35, attack: 0, defense: 0, protection: 0, level: 5, wealthLevel: 5}, attacks: [], defenses: [], image: "mon0004.png" },
  { id: 27, name: "Angry Dust Bunny", type: "Trash", stats: { health: 35, attack: 0, defense: 0, protection: 0, level: 5, wealthLevel: 5}, attacks: [], defenses: [], image: "mon0005.png" },
  { id: 11, name: "Poisonous Snake Pit", type: "Mini boss", stats: { health: 60, attack: 0, defense: 0, protection: 0, level: 5, wealthLevel: 5}, attacks: [], defenses: [], image: "mon0002.png" },
  { id: 28, name: "G.M.O. Chicken", type: "Mini boss", stats: { health: 60, attack: 0, defense: 0, protection: 0, level: 5, wealthLevel: 5}, attacks: [], defenses: [], image: "mon0007.png" },
  { id: 12, name: "Evil Dust Bunny", type: "Trash", stats: { health: 60, attack: 0, defense: 0, protection: 0, level: 6, wealthLevel: 6}, attacks: [], defenses: [], image: "mon0005.png" },
  { id: 13, name: "Evil Fungai", type: "Trash", stats: { health: 60, attack: 0, defense: 0, protection: 0, level: 6, wealthLevel: 6}, attacks: [], defenses: [], image: "mon0004.png" },
  { id: 29, name: "Djinn", type: "Trash", stats: { health: 50, attack: 0, defense: 0, protection: 0, level: 6, wealthLevel: 6}, attacks: [], defenses: [], image: "mon0001.png" },
  { id: 30, name: "Killer Ork", type: "Trash", stats: { health: 50, attack: 0, defense: 0, protection: 0, level: 6, wealthLevel: 6}, attacks: [], defenses: [], image: "mon0003.png" },
  { id: 31, name: "Snake Pit", type: "Trash", stats: { health: 50, attack: 0, defense: 0, protection: 0, level: 6, wealthLevel: 6}, attacks: [], defenses: [], image: "mon0002.png" },
  { id: 32, name: "Oozopod", type: "Mini boss", stats: { health: 75, attack: 0, defense: 0, protection: 0, level: 6, wealthLevel: 6}, attacks: [], defenses: [], image: "mon0010.png" },
  { id: 33, name: "G.M.O. Chicken", type: "Mini boss", stats: { health: 75, attack: 0, defense: 0, protection: 0, level: 6, wealthLevel: 6}, attacks: [], defenses: [], image: "mon0007.png" },
  { id: 34, name: "Poisonous Snake Pit", type: "Trash", stats: { health: 75, attack: 0, defense: 0, protection: 0, level: 7, wealthLevel: 7}, attacks: [], defenses: [], image: "mon0002.png" },
  { id: 35, name: "Angry Skeleton", type: "Trash", stats: { health: 70, attack: 0, defense: 0, protection: 0, level: 7, wealthLevel: 7}, attacks: [], defenses: [], image: "mon0000.png" },
  { id: 36, name: "Evil Dust Bunny", type: "Trash", stats: { health: 75, attack: 0, defense: 0, protection: 0, level: 7, wealthLevel: 7}, attacks: [], defenses: [], image: "mon0005.png" },
  { id: 37, name: "Angry Djinn", type: "Trash", stats: { health: 75, attack: 0, defense: 0, protection: 0, level: 7, wealthLevel: 7}, attacks: [], defenses: [], image: "mon0001.png" },
  { id: 38, name: "Evil Fungai", type: "Trash", stats: { health: 75, attack: 0, defense: 0, protection: 0, level: 7, wealthLevel: 7}, attacks: [], defenses: [], image: "mon0004.png" },
  { id: 39, name: "Woolly Boar", type: "Mini boss", stats: { health: 90, attack: 0, defense: 0, protection: 0, level: 7, wealthLevel: 7}, attacks: [], defenses: [], image: "mon0009.png" },
  { id: 40, name: "Oozopod", type: "Mini boss", stats: { health: 90, attack: 0, defense: 0, protection: 0, level: 7, wealthLevel: 7}, attacks: [], defenses: [], image: "mon0010.png" },
  { id: 41, name: "Klaksonaut", type: "Trash", stats: { health: 95, attack: 0, defense: 0, protection: 0, level: 8, wealthLevel: 8}, attacks: [], defenses: [], image: "mon0007.png" },
  { id: 42, name: "Poisonous Snake Pit", type: "Trash", stats: { health: 90, attack: 0, defense: 0, protection: 0, level: 8, wealthLevel: 8}, attacks: [], defenses: [], image: "mon0002.png" },
  { id: 43, name: "Evil Dust Bunny", type: "Trash", stats: { health: 75, attack: 0, defense: 0, protection: 0, level: 7, wealthLevel: 7}, attacks: [], defenses: [], image: "mon0005.png" },
  { id: 44, name: "Angry Djinn", type: "Trash", stats: { health: 75, attack: 0, defense: 0, protection: 0, level: 7, wealthLevel: 7}, attacks: [], defenses: [], image: "mon0001.png" },
  { id: 45, name: "Evil Fungai", type: "Trash", stats: { health: 75, attack: 0, defense: 0, protection: 0, level: 7, wealthLevel: 7}, attacks: [], defenses: [], image: "mon0004.png" },
  { id: 46, name: "Vampire Spy", type: "Mini boss", stats: { health: 115, attack: 0, defense: 0, protection: 0, level: 8, wealthLevel: 8}, attacks: [], defenses: [], image: "mon0008.png" },
  { id: 47, name: "Woolly Boar", type: "Mini boss", stats: { health: 110, attack: 0, defense: 0, protection: 0, level: 8, wealthLevel: 8}, attacks: [], defenses: [], image: "mon0009.png" },
  { id: 48, name: "Oozopod", type: "Mini boss", stats: { health: 110, attack: 0, defense: 0, protection: 0, level: 8, wealthLevel: 8}, attacks: [], defenses: [], image: "mon0010.png" },
];

const combineMerge = (target, source, options) => {
  const destination = target.slice();
  source.forEach((item, index) => {
    if (typeof destination[index] === 'undefined') {
      destination[index] = options.cloneUnlessOtherwiseSpecified(item, options);
    } else if (options.isMergeableObject(item)) {
      destination[index] = merge(target[index], item, options);
    } else if (target.indexOf(item) === -1) {
      destination.push(item);
    }
  });
  return destination;
};

// Create new array of items by merging monsters level-by-level
const mergedMonsters = [];
const oldMonstersFlat = Object.fromEntries(oldMonsters.flat().map(v => [v.id, v]));
const defaultBase = { stats: { gearDrop: {} }, attacks: [], defenses: [] };
for (let lvl = 0; lvl <= MAX_LEVELS; lvl += 1) {
  // Get level's new monster as object with id as key
  const newLevelMonsters = Object.fromEntries(
    newMonsters
      .filter(v => v.stats.level === lvl)
      .map(v => [v.id, deepmerge(deepmerge(defaultBase, oldMonstersFlat[v.id] || {}), v)]),
  );
  const newMonsterIds = Object.keys(newLevelMonsters);

  // Get level's old monsters as object with id as key, prune against new monsters
  const oldLevelMonsters = Object.fromEntries(
    (oldMonsters[lvl] || []).filter(v => newMonsterIds.includes(v.id)).map(v => [v.id, v]),
  );

  // Deep merge old and new level monsters, add to new mergedMonsters as array values
  const mergedLevelMonsters = deepmerge(oldLevelMonsters, newLevelMonsters, {
    arrayMerge: combineMerge,
  });

  if (Object.values(mergedLevelMonsters).length > 0) {
    mergedMonsters[lvl] = Object.values(mergedLevelMonsters);
  }
}

// Console it out
console.log('\n\n\n');
console.log(JSON.stringify(mergedMonsters, null, 2));
console.log('\n\n\n');
