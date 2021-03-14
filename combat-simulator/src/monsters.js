export default {
  "goblin": {
    stats: {health: 20, attack: 0, defense: 0, charge: 0, protection: 0, damage: 0, xp: 100},
    attacks: [
      {id: 0, bonus: 2, value: 2, target: "health"}
    ],
    defenses: [
      {id: 0, bonus: 2, value: 0, target: "health"}
    ]
  },
  "ork warrior": {
    stats: {health: 50, attack: 0, defense: 0, charge: 0, protection: 0, damage: 0, xp: 500},
    attacks: [
      {id: 0, bonus: 2, value: 5, target: "health"},
      {id: 1, bonus: 2, value: 5, target: "health"},
      {id: 2, bonus: 4, value: 5, target: "health"}
    ],
    defenses: [
      {id: 0, bonus: 2, value: 0, target: "health"},
      {id: 1, bonus: 2, value: 0, target: "health"},
      {id: 2, bonus: 5, value: 2, target: "health"},
    ]
  },
  "poison golin": {
    stats: {health: 20, attack: 0, defense: 0, charge: 0, protection: 0, damage: 0, xp: 500},
    attacks: [
      {id: 0, bonus: 2, value: 2, target: "health"},
      {id: 1, bonus: 2, value: 1, target: "attack"}
    ],
    defenses: [
      {id: 0, bonus: 2, value: 0}
    ]
  }
}
