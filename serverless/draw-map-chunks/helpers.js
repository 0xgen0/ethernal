/**
 * Calculate the viewport dimensions of rooms
 * @param {array} rooms - array of rooms
 * @return {object}
 */
const calculateViewport = rooms =>
  rooms.reduce(
    (prev, { coordinates }) => {
      const [x, y] = coordinates.split(',').map(Number);
      return {
        minX: Math.min(x, prev.minX),
        minY: Math.min(y, prev.minY),
        maxX: Math.max(x, prev.maxX),
        maxY: Math.max(y, prev.maxY),
      };
    },
    { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  );

/**
 * Format string to receive interpolated key names
 *   const str = format`<p>${'text'} would be defined</p>`;
 *   const result = str({ text: 'My string' });
 *   Output: "<p>My string would be defined</p>"
 * @param [String] strs (this)
 * @param [Object] keys
 * @return [Function]
 */
const format = (strs, ...keys) => data => {
  const tmp = strs.slice();
  keys.forEach((key, i) => {
    tmp[i] += data[key];
  });
  return tmp.join('');
};

module.exports = { calculateViewport, format };
