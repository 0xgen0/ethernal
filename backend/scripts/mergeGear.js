/**
 * MERGE NEW GEAR LIST INTO LEVEL-BASED GEAR ITEMS
 *
 * >> YOU WILL NEED TO COPY/PASTE THE CONSOLE OUTPUT AND REPLACE IN src/data/gears.js <<
 *
 */
const deepmerge = require('deepmerge');
const oldGear = require('../src/data/gears');

// HOW MANY LEVELS TO CREATE
const MAX_LEVELS = 8;

// PASTE IN THE UN-GROUPED NEW GEAR ITEMS
const newGear = [
  { id: 1, name: "Bone Sword", slotType: "attack", level: 0, rarity: "common", image: "wep_bonesword.png", actions: [] },
  { id: 4, name: "Buckler", slotType: "defense", level: 0, rarity: "common", image: "shld_buckler.png", actions: [] },
  { id: 1001, name: "Sharp Broken Sword", slotType: "attack", level: 1, rarity: "common", image: "wep_brokensword.png", actions: [] },
  { id: 1002, name: "Hammer", slotType: "attack", level: 1, rarity: "common", image: "wep_hammer.png", actions: [] },
  { id: 1003, name: "Celtic shield", slotType: "defense", level: 1, rarity: "common", image: "shld_celt.png", actions: [] },
  { id: 1004, name: "Drift Wood Shield", slotType: "defense", level: 1, rarity: "common", image: "shld_driftwood.png", actions: [] },
  { id: 2001, name: "Machette", slotType: "attack", level: 2, rarity: "common", image: "wep_knife.png", actions: [] },
  { id: 2002, name: "Rusty Sword", slotType: "attack", level: 2, rarity: "common", image: "wep_rusty.png", actions: [] },
  { id: 2003, name: "Strong Wooden Shield", slotType: "defense", level: 2, rarity: "common", image: "shld_wood.png", actions: [] },
  { id: 2004, name: "Strong Shield", slotType: "defense", level: 2, rarity: "common", image: "shld_wardoor.png", actions: [] },
  { id: 3001, name: "Mighty Sword", slotType: "attack", level: 3, rarity: "common", image: "wep_sword.png", actions: [] },
  { id: 3003, name: "Iron Shield", slotType: "defense", level: 3, rarity: "common", image: "shld_iron.png", actions: [] },
  { id: 4001, name: "Thunder Sword", slotType: "attack", level: 4, rarity: "common", image: "wep_sword.png", actions: [] },
  { id: 4002, name: "Thunder Shield", slotType: "defense", level: 4, rarity: "common", image: "shld_iron.png", actions: [] },
  { id: 5001, name: "Diamond Sword", slotType: "attack", level: 5, rarity: "common", image: "wep_sword.png", actions: [] },
  { id: 5002, name: "Diamond Shield", slotType: "defense", level: 5, rarity: "common", image: "shld_iron.png", actions: [] },
  { id: 6001, name: "Mythril Sword", slotType: "attack", level: 6, rarity: "common", image: "wep_sword.png", actions: [] },
  { id: 6002, name: "Mythril Shield", slotType: "defense", level: 6, rarity: "common", image: "shld_iron.png", actions: [] },
  { id: 7001, name: "Mythril Hammer", slotType: "attack", level: 7, rarity: "common", image: "wep_hammer.png", actions: [] },
  { id: 7002, name: "Storm Shield", slotType: "defense", level: 7, rarity: "common", image: "shld_iron.png", actions: [] },
  { id: 8001, name: "Legendary Machette", slotType: "attack", level: 8, rarity: "common", image: "wep_knife.png", actions: [] },
  { id: 8002, name: "Legendary Shield", slotType: "defense", level: 8, rarity: "common", image: "shld_iron.png", actions: [] },
  { id: 1111001, name: "Green Skull Ring", slotType: "accessory", level: 0, rarity: "unique", image: "item_special_ring.png", actions: [] },
  { id: 1111002, name: "Conan's Great Sword", slotType: "attack", level: 0, rarity: "unique", image: "wep_special_sword2.png", actions: [] },
  { id: 1111003, name: "Pearl's Necklace", slotType: "accessory", level: 0, rarity: "unique", image: "item_necklace.png", actions: [] },
  { id: 1111004, name: "Mighty Shield", slotType: "defense", level: 0, rarity: "unique", image: "wep_special_shield.png", actions: [] },
  { id: 1111005, name: "Magical Boots", slotType: "accessory", level: 0, rarity: "unique", image: "item_boot.png", actions: [] },
  { id: 1111006, name: "Blood Sword", slotType: "attack", level: 0, rarity: "unique", image: "wep_special_sword.png", actions: [] },
];

// Create new array of items by merging gear level-by-level
const mergedGear = [];
for (let lvl = 0; lvl <= MAX_LEVELS; lvl += 1) {
  // Get level's old gear as object with id as key
  const oldLevelGear = Object.fromEntries((oldGear[lvl] || []).map(v => [v.id, v]));

  // Get level's new gear as object with id as key
  const newLevelGear = Object.fromEntries(
    newGear.filter(v => v.id >= lvl * 1000 && v.id < (lvl + 1) * 1000).map(v => [v.id, v]),
  );

  // Deep merge old and new level gear, add to new mergedGear as array values
  const mergedLevelGear = deepmerge(oldLevelGear, newLevelGear);
  if (Object.values(mergedLevelGear).length > 0) {
    mergedGear[lvl] = Object.values(mergedLevelGear);
  }
}

// Console it out
console.log('\n\n\n');
console.log(JSON.stringify(mergedGear, null, 2));
console.log('\n\n\n');
