const elements = {
  fire: {
    icon: '/images/game-icons/element-icons/fire_64x64.png',
    color: 0xde3d37,
  },
  air: {
    icon: '/images/game-icons/element-icons/air_64x64.png',
    color: 0x3c6dee,
  },
  electricity: {
    icon: '/images/game-icons/element-icons/electricity_64x64.png',
    color: 0xfff61a,
  },
  earth: {
    icon: '/images/game-icons/element-icons/wood_64x64.png',
    color: 0x27ff7e,
  },
  water: {
    icon: '/images/game-icons/element-icons/water_64x64.png',
    color: 0x7761ff,
  },
};

export const AREA_DATA = [
  { color: 0x666666 },
  ...Object.keys(elements).map(key => ({ key, ...elements[key] })),
  { color: 0xdddddd },
];

export const AREA_COLORS = AREA_DATA.map(area => area.color);

export const getAreaByType = type => AREA_DATA[type];

// @DEPRECATED - WILL BE REMOVED SOON
elements.wood = elements.earth;

export default elements;
