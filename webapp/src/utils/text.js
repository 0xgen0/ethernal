const capitalize = str => `${str.charAt(0).toUpperCase()}${str.slice(1)}`;

const titleize = str => str.split(' ').map(capitalize).join(' ');

const pluralize = (str, size, plural) => {
  const exceptions = ['gear'];
  if (exceptions.includes(str.toLowerCase())) {
    return str;
  }
  if (size === 1) {
    return str;
  }
  return plural || `${str}s`;
};

const humanizeJoin = (items, str = 'and') => {
  const clone = items.slice();
  if (clone.length > 2) {
    const last = clone.pop();
    return `${clone.join(', ')}, ${str} ${last}`;
  }
  if (clone.length === 2) {
    return `${clone.shift()} ${str} ${clone.pop()}`;
  }
  if (clone.length === 1) {
    return clone.shift();
  }
  return '';
};

const typewriter = (item, opts = {}) => {
  const { speed = 25 } = opts;
  const node = item;

  // Remove empty " " nodes
  node.childNodes.forEach(child => {
    if (child.nodeType === 3 && child.textContent.trim() === '') {
      node.removeChild(child);
    }
  });

  // Check if able to type out
  const valid = node.childNodes.length === 1 && node.childNodes[0].nodeType === 3;
  if (!valid) {
    // eslint-disable-next-line no-console
    console.error(`This transition only works on elements with a single text node child`);
    return null;
  }

  const text = node.textContent;
  const duration = text.length * speed;

  return {
    duration,
    tick: t => {
      // Only type out last text item
      let typed = text;
      if (!node.nextSibling || (node.nextSibling.nodeType === 3 && node.nextSibling.textContent === '')) {
        // eslint-disable-next-line no-bitwise
        const i = ~~(text.length * t);
        typed = text.slice(0, i);
      }
      node.textContent = typed;

      if (node.parentNode) {
        node.parentNode.scrollTop = node.parentNode.scrollHeight;
      }

      if (t === 1) {
        const evt = new Event('done');
        node.dispatchEvent(evt);
      }
    },
  };
};

module.exports = {
  capitalize,
  humanizeJoin,
  pluralize,
  titleize,
  typewriter,
};
