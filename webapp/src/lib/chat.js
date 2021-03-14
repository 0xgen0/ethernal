import { get } from 'svelte/store';

import { chatMessages, onlineCharacters } from 'lib/cache';
import { mapModal } from 'stores/screen';
import { pluralize, humanizeJoin } from 'utils/text';

import BoxButton from 'components/BoxButton';

export const quickActions = [
  // 'trade',
  'buy',
  'sell',
  '👋',
  '👍',
  '👎',
  '⚔️',
  '🛡',
  '❤️',
  '😀',
  '🙁',
  '🙂',
  '😠',
  '😂',
  '💩',
  '💥',
];

class Message {
  constructor({ character, message, type }) {
    this.id = Date.now();
    this.character = character;
    this.type = type;
    this.message = message;
    this.responses = [];

    const prevMessages = get(chatMessages).messages.flat();
    this.prevMessage = prevMessages[prevMessages.length - 1];
  }

  get content() {
    return this.responses.map((resp, i) => ({
      id: `${this.id}-${i}`,
      character: this.character,
      type: this.type,
      isPrivate: this.isPrivate,
      ...resp,
    }));
  }

  get isPrivate() {
    return this.type === 'private';
  }

  add(content) {
    this.responses.push({ content });
  }

  addHtml(...html) {
    this.responses.push({ html });
  }

  generateTradeOffer(character, offer) {
    const info = get(onlineCharacters)[character];
    const keys = [
      'fire element',
      'air element',
      'electricity element',
      'earth element',
      'water element',
      'coin',
      'key',
      'fragment',
    ];
    const amounts = (offer.amounts || []).map((n, i) => n && `${n} ${pluralize(keys[i], n)}`).filter(Boolean);

    const gear = (offer.gears || [])
      .map(g => info.gear.find(n => n.id === g) || {})
      .map(({ name }) => name || 'unnamed item');

    return humanizeJoin([...gear, ...amounts].filter(Boolean));
  }

  generate() {
    const { action, content, character } = this.message;

    switch (action) {
      case 'trade': {
        const { trade } = this.message;
        if (!trade) {
          this.add(content || 'Let’s trade!');
          break;
        }

        switch (trade.status) {
          case 'request': {
            const { buyer, seller, history: deals } = trade;
            const { deal } = deals[deals.length - 1];

            const buyerOffer = this.generateTradeOffer(buyer, deal.buyer);
            const sellerOffer = this.generateTradeOffer(seller, deal.seller);

            this.addHtml(
              `Offered <strong>${buyerOffer}</strong> for <strong>${sellerOffer}</strong>. Waiting for response.`,
            );
            break;
          }
          case 'denied': {
            const party = character === trade.buyer ? 'buyer' : 'seller';
            this.add(`Trade was rejected by ${party}.`);
            break;
          }
          case 'completed': {
            this.add('Your trade was completed.');
            break;
          }
          default: {
            break;
          }
        }
        break;
      }
      case 'buy': {
        this.add('I want to buy.');
        break;
      }
      case 'sell': {
        this.add('I want to sell.');
        break;
      }
      case 'yes':
      case 'no': {
        this.add(capitalize(action));
        break;
      }
      default: {
        this.add(action || content);
        break;
      }
    }

    // Follow-up messages
    if (this.prevMessage && this.prevMessage.content.length) {
      const { message: prevMessage } = this.prevMessage;
      switch (action) {
        case 'yes':
        case '👍': {
          if (prevMessage.action === 'sell') {
            this.responses.push({
              html: [
                {
                  this: BoxButton,
                  type: 'plain link underline',
                  onClick: () => mapModal.open('tradeBuyer', { id: this.prevMessage.character.character }),
                  content: 'Here’s my bag.',
                },
                ' Select what you want and make an offer.',
              ],
              character: this.prevMessage.character,
            });
          } else if (prevMessage.action === 'buy' || (prevMessage.action === 'trade' && !prevMessage.trade)) {
            this.addHtml(
              {
                this: BoxButton,
                type: 'plain link underline',
                onClick: () => mapModal.open('tradeBuyer', { id: this.character.character }),
                content: 'Here’s my bag.',
              },
              ' Select what you want and make an offer.',
            );
          }
          break;
        }
        default: {
          break;
        }
      }
    }

    return this;
  }
}

export default Message;
