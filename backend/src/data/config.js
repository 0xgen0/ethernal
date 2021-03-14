module.exports = {
  player: {
    stats: {health: 100, attack: 0, defense: 0, protection: 0, charge: 0, damage: 0},
    attacks: [
      {id: 0, bonus: 5, value: 6, target: "health"},
      {id: 1, bonus: 2, value: 10, target: "health"},
      {id: 2, bonus: 3, value: 1, target: "protection"},
      {id: 3, bonus: 3, value: 1, target: "defense"},
      {id: 4, bonus: 1, value: 5, target: "attack"},
    ],
    defenses: [
      {id: 0, bonus: 2, value: 1},
      {id: 1, bonus: 1, value: 2},
      {id: 2, bonus: 1, value: 0}
    ]
  },
  targets: {
    attack: ["health", "attack", "defense", "protection"],
    defense: ["protection"]
  }
};
