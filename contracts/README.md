# Ethernal contracts

## How to run

Install the dependencies for contracts and backend

```
nvm use
cd ../backend
npm install
cd ../contracts
npm install
```

You might need to `cp mnemonic.local .mnemonic` to get working.

Start `local` blockchain and deploy contracts to them.

```
npm run dev
```

If you also want to have some rooms generated, this will deploy contracts and run bot that will try to discover 100 rooms.

```
npm run dev:walker
```

Contracts are ready to be used when this message appears:

```
node running at http://localhost:8545 (chainId: 1586884848563 )
```

Data about currently deployed contracts is written to `../webapp/contracts/development.json` 
and node RPC is listening at port 8585 by default.

Dungeon keys are generated to `.claimKeys`, local environment always generates same keys.
