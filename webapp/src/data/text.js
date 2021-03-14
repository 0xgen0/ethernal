import { pluralize, humanizeJoin } from 'utils/text';
import { formatCoordinates } from 'utils/utils';

export const t = (strs, ...keys) => data => {
  const tmp = strs.slice();
  keys.forEach((key, i) => {
    tmp[i] += data[key];
  });
  return tmp.join('');
};

export const ELLIPSIS = '...'; // '…';

export const actionsText = {
  continue: 'Continue',
  run: 'Flee',
  nextTurn: 'Next Turn',
  teleporting: 'teleporting',
  cancel: 'cancel',
  attack: 'attack',
  defense: 'defense',
};

export const combatText = {
  start: 'You chose to attack! Select an attack and a defense action card.',
  turn: t`Your attack ${'attack'}, the monster ${'defense'}.`,
  turnCharged: t`You ${'attack'}, the monster ${'defense'}.`,
  attack: 'You engaged the monster in combat.',
  damage: {
    hit: t`hits for ${'value'} HP`,
    hitReduce: t`hits for ${'value'} HP (reduced by ${'reduced'})`,
    reduce: t`reduces ${'target'} by ${'value'}`,
    charge: t`charged your attack cards`, //  by ${'value'}
    missed: 'missed',
  },
  escape: {
    success: t`The monster ${'turn'} and you escaped to the previous room.`,
    failure: 'You couldn‘t escape the monster... this room will be your tomb forever.',
  },
  finish: {
    success: 'You defeated the monster and collected the loot.',
    notifyEquip: 'You can equip your new gear in the Bag and Profile page.',
  },
  collected: ({ coordinates, total, coins }) => {
    const list = [
      coins && `${coins} ${pluralize('coin', coins)}`,
      total && `${total} ${pluralize('element', total)}`,
    ].filter(Boolean);
    return `You generated room ${formatCoordinates(coordinates)}, and collected ${humanizeJoin(list)}.`;
  },
  searchLoot: 'Search for loot',
  died: 'You died!',
  help: t`<em>${'player'}</em> called for help in room <em>${'x'}, ${'y'}</em> on floor <em>${'z'}</em>.`,
};

export const statusesText = {
  entered:
    'You’ve entered the dungeon. A rune appears on a wall beside you... and just as quickly, vanishes. Looks like you are in a teleport.',
  dead: 'You died!',
  levelUp: 'You have enough experience to level up! Go to your profile page.',
  lyingDead: "You're lying dead on the floor.",
  monsterDead: 'The monster was killed just before you arrived!',
  player: {
    notInDungeon: 'outside of the dungeon',
    exploring: 'exploring',
    blockedByMonster: 'trapped by a monster',
    attackingMonster: 'in combat with',
    claimingRewards: 'collecting loot',
    justDied: 'just died',
    dead: 'dead',
  },
  rooms: {
    monster: t`A ${'monster'} is in the room.`,
  },
  gearBroken: t`Your ${'name'} shattered!`,
  rareArtFound: 'You found a rare art! The NFT will be transferred to your Portis wallet.',
};

export const teleportText = {
  notInRoom: 'You have to be in another teleport room to teleport there.',
  requiresLevel: t`Requires LVL ${'level'} to go`,
  goHere: t`Go here for ${'cost'} coins`,
};

export const roomsText = {
  kinds: {
    1: 'Regular',
    2: 'Teleport',
    3: 'Temple',
    4: 'Lore Room',
    5: 'Carrier Room',
  },
  names: {
    // regular room
    1: [
      'Room',
      'Cellar',
      'Kitchen',
      'Furnace',
      'Dusty Room',
      'Chamber',
      'Burial Chamber',
      'Oubliette',
      'Guard Station',
      'Statuary',
    ],
    // teleport
    2: ['Teleport'],
    // temple
    3: ['Djinn Temple', 'Temple of Light'],
    // what is 4?
    4: ['Lore Room'],
    5: ['Carrier'],
  },
  sentences: {
    entry: {
      5: ['You entered a carrier room. Here you can send your items to and from your vault.'],
      4: [
        'A watering hole, though where the source might be is anybody’s guess.',
        'A steaming pool is fed from a small trickle in the wall. You stoop to taste, but realize this hot spring is way too hot.',
        'Small frog-like creatures flitter in an out of existence as you approach their pond. The water is murky, unpotable.',
        'It’s a temple... no, the light was playing tricks. Just stalagmites.',
        'There’s a depression here, or rather, a crater... but how could a fallen star strike here?',
        'You look above you to see a pool of water suspended against the ceiling. How, or why, is beyond your comprehension.',
        'Stalagmites and stalactites have shot out of the earth, making this room seem like a pair of open jaws.',
        'A catacomb that drips with fetidness.',
        'Someone hollowed out a catacomb here centuries... no, millennia ago.',
        'What you think is a natural hollow turns out to be unnatural: a small catacomb.',
        'The dead were buried in the wall here, once, but now they’ve turned to dust.',
        'A crossroads. Yes, definitely; there’s a skeleton swinging from a gibbet over yon.',
        'Someone seeled a vault up long ago, the treasures within long since looted.',
        'A treasure hold, its bars broken and its booty gone. Not very secure, hm?',
        'Weapons were stored here, once. Most are gone. The rest are rusted.',
      ],
      3: [
        'You came across a strange temple. Walls are filled with writing that you cannot recognize.',
        'Countless candles break the darkness, you are in an ancient temple.',
        'An abandoned temple. The pews have been broken apart. Firewood?',
      ],
      2: ['You entered a teleport. Tap on another teleport to go there.'],
      1: [
        'A small nook. Nothing special.',
        'This notch in the rock seems like it was carved out by a long-dead river.',
        'A crack in the earth has opened up a room, large enough (barely) for you to stretch out, should you want to.',
        'A rockslide has closed off all but a small hole that forces you to hunch.',
        'This bend in the cavern seems to be curving around itself',
        'A small depression in a much larger space.',
        'A cavern... you know you haven’t been here before (?), but the repetition is beginning to grate on your mind. No wonder people went mad.',
        'A small cave: nothing of real note.',
        'This pond is possibly knee-deep. Best not check it.',
        'A watering hole, though where the source might be is anybody’s guess.',
        'A steaming pool is fed from a small trickle in the wall. You stoop to taste, but realize this hot spring is way too hot.',
        'Small frog-like creatures flitter in an out of existence as you approach their pond. The water is murky, unpotable.',
        'It’s a temple... no, the light was playing tricks. Just stalagmites.',
        'There’s a depression here, or rather, a crater... but how could a fallen star strike here?',
        'You look above you to see a pool of water suspended against the ceiling. How, or why, is beyond your comprehension.',
        'Stalagmites and stalactites have shot out of the earth, making this room seem like a pair of open jaws.',
        'A catacomb that drips with fetidness.',
        'Someone hollowed out a catacomb here centuries... no, millennia ago.',
        'What you think is a natural hollow turns out to be unnatural: a small catacomb.',
        'The dead were buried in the wall here, once, but now they’ve turned to dust.',
        'A crossroads. Yes, definitely; there’s a skeleton swinging from a gibbet over yon.',
        'Someone seeled a vault up long ago, the treasures within long since looted.',
        'A treasure hold, its bars broken and its booty gone. Not very secure, hm?',
        'Weapons were stored here, once. Most are gone. The rest are rusted.',
        'Broken casks line the walls. This must have been a storehold for spirits: the alcoholic kind.',
        'The cavern you’ve stepped into houses beast-sized mushrooms.',
        'Seaweed-like tendrils dangle from the ceiling, drifting like they’re searching for something.',
        'Barnacles flutter upward from the ground, snapping back in as you walk past.',
        'Grey “bushes” sprout from extrusions of rock. Or maybe they are sponges...',
        'What looks like a nest: there are four-toed tracks the size of your chest leading away in each direction.',
        'Small pebbles are astrewn the path. As you step on them, goo oozes out. A failed clutch a big (big) insectoid mother.',
        'Egg shells lay in a makeshift nest made out of stone.',
        'A small frilled lizard, recently hatched, hisses at you as you approach its home.',
        'A crystaline labyrinth, formed from the faintly glowing stone above and below.',
        'The entire side of this wall is as reflective as a mirror... yet your image does not reflect back.',
        'Golden nuggets too big to carry lay across the path. Figures.',
        'A stone circle, used for telling the seasons. But down here? Why?',
        'A ring of stones leading to an altar that is bleeding. Keep a distance.',
        'A game trail. You can tell by the sludge left behind by elephant-sized slugs.',
        'Something with lots of legs and probably as many teeth to match marched through this stretch sometime earlier. ',
        'There are many holes in the walls, out of which stare many eyes. They belong to things that seem too small to bother you... one-on-one.',
        'A gigantic tooth is wedged into the wall of this cavern. Something was hungry enough to try to eat rocks.',
        'A small cemetery... really, a boneyard. Skeletons of numerous species lay jumbled about. A potter’s “field,” maybe? Or a warning?',
        'There are no echoes. The walls eat all sound..',
      ],
    },
    exit: [
      'Tucked away behind a hidden door, it must have been something amazing at some point. Now, it smells of death.',
      'You hear whispers, for a moment, but then they’re gone. Best not tarry.',
      'The ground crunches underneath. You swallow your breath but do not look down.',
      'Something moves in the dark. You twist around. It was your shadow. Hah. Yes. That.',
      'The way this room shifts in the gloom makes you want a drink. No, not water.',
      'It’s quiet again. That’s good enough for you.',
      'You step on something that squishes... you look down to find a small family of snails yelling up at you, their patriarch dead underneath your heel. C’est la vie.',
      'A rune appears on a wall beside you... and just as quickly, vanishes.',
      'You feel a breeze from a rock to your side. It feels hot, and sticky... like an animal’s breath.',
      'Something urges you to shout to see if there’s an echo, but a stronger part of you fights down the urge.',
      'The rocks almost give way underneath. You stumble, but regain your footing. A good thing: there’s a sinkhole to your right that’s a long way down.',
      'A skeleton grins at you in the corner. It’s been stripped bare... by whom? Or what?',
      'There doesn’t seem to be anything in particular in here. Or so you can see.',
      'Your footsteps scrabble against the stone. Otherwise, it’s quiet.',
      'A few steps takes you into what was a fire circle. How old? Who made it? No way to tell.',
      'The stone here is loose. This was the site of an avalanche, ages ago.',
      'Hackles rise up on your neck. You’re ready for anything... but nothing jumps out.',
      'A small bat flutters by your head. You brush it away. It squeaks, but complies.',
      'Hordes of rats scurry away from your approach. They hiss but do not attack.',
      'A rank draft hits you the face, almost making you vomit. This gets better and better.',
      'You step on the shells of insects, long-since dead.',
      'For a brief instant, you think you see sunlight. But it is just the reflection of your torch on a jewel in the ceiling, far overhead.',
      'Your next step finds your foot pressing down on a plate. A trap... but nothing happens.',
      'You look to the side: a skeleton sits with a large javelin in its chest. Better him than you.',
      'Long ago, someone tripped a trap here: the legs and arms of a skeleton rest on the ground. The rest has been turned to ash from some explosion.',
      'Acid drips down overhead. You leap ahead just as a vat of something corrosive crashes down. The stone is unmarked. A drop sizzles into your skin, however.',
      'The quietitude is what gets to you. How does anything survive down here?',
    ],
  },
};

export const classes = {
  '0': ['Warrior', ['Basic all around class']],
  '1': ['Explorer', ['Higher coin gain from generating rooms', 'Weak attack gear']],
  '2': ['Mage', ['More cursed gear', 'Strong defense gear', 'Higher elemental gain']],
  '3': ['Barbarian', ['Strong attack gear', 'Weak defense gear', 'Lower elemental and coin gain']],
};

export const rebirth = {
  startOver: 'Start over with a new class',
  rebirth: 'Create an inherited character',
};

export const notifications = {
  roomRename: t`<em>${'characterName'}</em> changed the name of room <em>${'x'}, ${'y'}</em> on floor <em>${'z'}</em> to <em>${'customName'}</em>.`,
  ubfAvailable: '🍎 Food bank ready to claim',
};
