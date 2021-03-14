import { ELLIPSIS, combatText, statusesText } from 'data/text';

export const equalSets = (a, b) => a.size === b.size && [...a].every(value => b.has(value));
export const equalKeys = (a, b) => equalSets(new Set(Object.keys(a)), new Set(Object.keys(b)));

export const groupBy = (xs, key) =>
  xs.reduce((rv, x) => {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});

export const gearImage = ({ image = 'item_book.png' }) =>
  image.startsWith('https://') ? image : `https://assets.dev.ethernal.world/gears/${image}`;

export const monsterImage = image => `https://assets.dev.ethernal.world/monsters/${image}`;

export const groupActions = ({ actions, slotType }) => {
  if (!actions) {
    return [];
  }

  const grouped = groupBy(actions, 'target');
  const aggregated = Object.entries(grouped).map(([target, groupedActions]) =>
    groupedActions.reduce(
      (stats, action) => ({
        ...stats,
        bonus: {
          min: stats.bonus.min !== null ? Math.min(stats.bonus.min, action.bonus) : action.bonus,
          max: stats.bonus.max !== null ? Math.max(stats.bonus.max, action.bonus) : action.bonus,
        },
        value: {
          min: stats.value.min !== null ? Math.min(stats.value.min, action.value) : action.value,
          max: stats.value.max !== null ? Math.max(stats.value.max, action.value) : action.value,
        },
      }),
      {
        type: slotType,
        target,
        bonus: { max: null, min: null },
        value: { max: null, min: null },
        count: groupedActions.length,
      },
    ),
  );
  return Object.values(aggregated).reduce((arr, action) => [...arr, action], []);
};

export const distinctById = objectsWithId => {
  const byId = groupBy(objectsWithId, 'id');
  const ids = Array.from(new Set(objectsWithId.map(o => o.id)));
  return ids.map(id => {
    const objects = byId[id];
    return { ...objects[0], _count: objects.length };
  });
};

export const receivedText = ({ elements, coins }, { areaType, coordinates }) => {
  const total = areaType > 0 && areaType < 6 ? elements.reduce((sum, a) => sum + a, 0) : 0;
  return combatText.collected({ coordinates, total, coins });
};

export const inflictionText = ({ missed, inflicted, reduced }) => {
  const toMsg = (target, value) => {
    if (target === 'health') {
      if (reduced) {
        return combatText.damage.hitReduce({ value, reduced });
      }
      return combatText.damage.hit({ value });
    }
    if (target === 'charge') {
      return combatText.damage.charge({ target, value: Math.abs(value) });
    }
    return combatText.damage.reduce({ target, value });
  };
  if (missed) {
    return combatText.damage.missed;
  }
  return Object.keys(inflicted)
    .map(target => toMsg(target, inflicted[target]))
    .join(' ');
};

export const statusText = status => {
  if (!status) {
    return ELLIPSIS;
  }
  const texts = {
    'not in dungeon': statusesText.player.notInDungeon,
    exploring: statusesText.player.exploring,
    'blocked by monster': statusesText.player.blockedByMonster,
    'attacking monster': statusesText.player.attackingMonster,
    'claiming rewards': statusesText.player.claimingRewards,
    'just died': statusesText.player.justDied,
    dead: statusesText.player.dead,
  };

  let text = texts[status.status] || ELLIPSIS;
  if (status.status === 'attacking monster') {
    text += ` ${status.combat.monster.name}`;
  }

  return text;
};

const portraits = ['port_war_6x.png', 'port_adv_6x.png', 'port_wiz_6x.png', 'port_bar_6x.png'];
export const classPortrait = (characterClass = 0) => `/images/ui/portraits/${portraits[characterClass]}`;
