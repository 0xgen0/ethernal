const Sentry = require('@sentry/node');
const Quest = require('./quest');
const { coordinatesToLocation, overrideFloor, parseCoordinates } = require('../utils');

class NextLevel extends Quest {
  floor = 0;
  npc = 'gatekeeper';
  data = null;
  rules = {
    npc: true,
  };

  get coordinates() {
    return this.data;
  }

  async canAccept() {
    const { z } = parseCoordinates(await this.dungeon.character.coordinates(this.character));
    return this.floor === z;
  }

  async accept() {
    await super.accept();
    this.data = await this.dungeon.character.coordinates(this.character);
  }

  async spawnNPC() {
    const room = await this.dungeon.room(this.data);
    if (room && this.status !== 'completed') {
      await super.spawnNPC();
    }
  }

  async handleUpdate() {
    await this.spawnNPC();
    if (this.status === 'completed') {
      await super.removeNPC();
    }
  }

  async advanceHandler({ coordinates, combat }) {
    if (combat) {
      const { z } = parseCoordinates(coordinates);
      if (this.floor === z && combat.monster.type === 'big boss') {
        if (this.status === 'discovered') {
          this.changeStatus('accepted');
        }
        this.changeStatus('claiming');
        if (!this.data) {
          const rooms = await this.dungeon.map.roomsByDistance(coordinates);
          const nearbyTeleport = rooms.find(({kind, npc}) => Number(kind) === 2 && (!npc || npc.type === this.npc));
          this.data = nearbyTeleport ? nearbyTeleport.coordinates : overrideFloor('0,0', this.floor);
        }
        return true;
      }
    }
    return false;
  }

  async claimRewards() {
    const tx = await this.dungeon.contracts.DungeonAdmin.teleportCharacter(
      this.character,
      coordinatesToLocation(overrideFloor('0,0', this.floor + 1)),
      { gasLimit: 700000 },
    );
    await tx.wait();
  }
}

class UnlockLevel1 extends NextLevel {
  floor = 0;
}

class UnlockLevel2 extends NextLevel {
  floor = 1;
}

class UnlockLevel3 extends NextLevel {
  floor = 2;
}

class UnlockLevel4 extends NextLevel {
  floor = 3;
}

class UnlockLevel5 extends NextLevel {
  floor = 4;
}

class UnlockLevel6 extends NextLevel {
  floor = 5;
}

class UnlockLevel7 extends NextLevel {
  floor = 6;
}

class UnlockLevel8 extends NextLevel {
  floor = 7;
}

module.exports = { UnlockLevel1, UnlockLevel2, UnlockLevel3, UnlockLevel4, UnlockLevel5, UnlockLevel6, UnlockLevel7, UnlockLevel8 };
