export const targetLabels = {
  attack: 'ATK',
  defense: 'DEF',
  health: 'HP',
  protection: 'ARMOR',
};

const typeLabels = {
  attack: 'DMG',
  defense: 'ARMOR',
};

export const targetText = ({ target, type }, typeOverride = type) => targetLabels[target] || typeLabels[typeOverride];
export const typeText = ({ type }) => typeLabels[type];
