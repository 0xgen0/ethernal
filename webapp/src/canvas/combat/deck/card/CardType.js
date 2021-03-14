/**
 * An Enumeration for all Card types.
 *
 * @type {{DEFENSE: string, HP: string, ATTACK: string, CURSE: string, CHARGE: string, PLACEHOLDER: string}}
 *
 * @enum
 */
const CardType = Object.freeze({
  ATTACK: 'attack',
  DEFENSE: 'defense',
  CURSE: 'curse',
  CHARGE: 'charge',
  PLACEHOLDER: 'placeholder',
  HP: 'hp',
});

export default CardType;
