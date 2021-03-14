import { t as formatText } from 'data/text';

import IconAlchemist from 'assets/npc-alchemist.png';
import IconGuardian from 'assets/npc-guardian.png';
import IconMerchant from 'assets/npc-merchant.png';

/**
 * text states are:
 *  1. discovered -> NPC initial talking
 *  2. accepted -> accepted NPC quest
 *  3. advance -> continue with each quest milestone.
 *  4. claiming -> returning to NPC to claim result
 *  5. claimed -> post-claim NPC text
 *  6. completed -> woo!
 */
const levelGuardian = floor => ({
  title: 'Going Deeper',
  name: 'The Guardian',
  avatar: 'guardian',
  description: 'Defeat a legendary monster to unlock the next floor.',
  buttons: {
    npc: 'Talk',
    action: 'Take',
  },
  notification: {
    text: formatText`Visit the The Guardian in Teleport ${'room'}.`,
  },
  states: {
    discovered: [
      {
        text: `I am guarding the portal to floor ${floor} of the dungeon.`,
        cancel: 'Bye',
        next: 'Next floor?',
      },
      {
        text: `First prove yourself by finding and defeating a legendary monster on floor ${floor - 1}. Then come back to me.`,
        cancel: 'Not interested',
        accept: 'I will do it!',
      },
    ],
    incomplete: [
      {
        text: 'Do not waste my time. Come back once you have defeated a legendary monster.',
        cancel: 'Ok',
      },
    ],
    claiming: [
      {
        text: `Well done. You have defeated a legendary monster and unlocked the portal to floor ${floor}. ${floor === 1 ? 'You can now use teleports as portals to go to unlocked floors.' : '' } Would you like to go there now?`,
        reward: false,
        cancel: 'Not yet',
        claim: 'Let\'s go',
      },
    ],
  },
});
const quests = {
  '1': {
    title: 'The Cartographer\'s Quest',
    description: 'Visit 2 Lore rooms to gather information and bring them back to the Cartographer.',
    avatar: 'merchant',
    buttons: {
      npc: 'Talk',
      action: 'Read',
    },
    notification: {
      text: formatText`Visit the Cartographer in room ${'room'} (floor ${'floor'}).`,
    },
    states: {
      // Opening messages
      discovered: [
        {
          text:
            'This dungeon is an ever-changing labyrinth. It\'s unwise to proceed without a map. Long ago I have performed an arcane ritual that allows me to create an ever-changing map. But I\'m missing vital information... ',
          cancel: 'Not interested',
          next: 'Information?',
        },
        {
          text:
            'They can be found in the Lore rooms. They look like the current room we are in. Visit 2 Lore rooms and come back to me.',
          cancel: 'Not interested',
          accept: 'Start quest',
        },
      ],
      // Lore room messages
      advance: {
        0: [
          {
            hideAvatar: true,
            text: 'The Ethernal is spoken of in hushed whispers around firepits the world over.',
            advance: 'Remember it',
          },
        ],
        1: [
          {
            hideAvatar: true,
            text: 'There is untold wealth in that labyrinth, leftover from a forgotten civilization. There is also damnation.',
            advance: 'Remember it',
          },
        ],
        2: [
          {
            hideAvatar: true,
            text: 'Legend holds that whoever lived in those depths were wiped out in a single night of cataclysmic horror for blaspheming their elemental gods.',
            advance: 'Remember it',
          },
        ],
        3: [
          {
            hideAvatar: true,
            text: 'The perished left behind a warren of endlessly looping halls that warp to the tune of an eldritch heartbeat.',
            advance: 'Remember it',
          },
        ],
      },
      // Returning NPC visit incomplete goal
      incomplete: [
        {
          closeable: true,
          text:
            'My ritual summons demons to assist me in making an ever-changing map. I still need more information however. Visit 2 Lore rooms and come back to me. ',
          cancel: 'Ok',
        },
      ],
      // Returning NPC visting completed goal
      claiming: [
        {
          text: 'Ah ha! You\'ve gathered all the information that I need. I have summoned my demons and made you a map. It will change as the dungeon grows. Take it and you can open it whenever you are lost.',
          reward: true,
          claim: 'Take map',
        },
      ],
      // Returning NPC visit completed quest
      completed: [
        {
          text:
            'Hope you are finding your map helpful. You can still go to Lore rooms to learn more about the dungeon.',
          cancel: 'Ok',
        },
      ],
    },
  },
  '2': {
    title: 'The Alchemist\'s Fragment',
    name: 'The Alchemist',
    description: 'Collect fragments from the Alchemist.',
    avatar: 'alchemist',
    buttons: {
      npc: 'Talk',
      action: 'Take',
    },
    states: {
      claiming: [
        {
          text: 'It\'s a breakthrough! I have discovered the insight to how new rooms are generated in the dungeon.',
          cancel: 'Not interested',
          next: 'New rooms?',
        },
        {
          text: 'You can generate a new room with fragments by clicking on arrows that lead into the darkness. Give me items and I will turn them into fragments. I can give you some now to get you started.',
          cancel: 'Not interested',
          next: 'Ok',
        },
        {
          text: 'Here are your fragments. Go forth and discover new rooms.',
          reward: true,
          claim: 'Take it',
        },
      ],
    },
  },
  '3': levelGuardian(1),
  '4': levelGuardian(2),
  '5': levelGuardian(3),
  '6': levelGuardian(4),
  '7': levelGuardian(5),
  '8': levelGuardian(6),
  '9': levelGuardian(7),
  '10': levelGuardian(8),
  '11': {
    title: 'Dungeon Keeper\'s Key',
    avatar: 'alchemist',
    name: 'The Alchemist',
    description: 'Take the Dungeon Keeper\'s key from the Alchemist by generating/owning your first room.',
    buttons: {
      npc: 'Talk',
      action: 'Take',
    },
    states: {
      claiming: [
        {
          text: 'Your first room! You are now a Dungeon Keeper. When you generate a room you become the owner of it, and you will earn rewards. You can also add things into your room.',
          claim: 'Reward?',
        },
        {
          text: 'You will received a fragment when other characters move or take an action in your room. You\'ll also get 20% of fees from rooms like Teleport.',
          claim: 'Tell me more',
        },
        {
          text: 'You will need to pay taxes though. Here, take this Dungeon Keeper\'s key. You can open your room manager with it.',
          reward: true,
          claim: 'Take it',
        },
      ],
    },
  },
};

export const npcAvatar = avatar => {
  switch (avatar) {
    case 'guardian': {
      return IconGuardian;
    }
    case 'merchant': {
      return IconMerchant;
    }
    default: {
      return IconAlchemist;
    }
  }
};

export default quests;
