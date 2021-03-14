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

Data about currently deployed contracts is written to `../webapp/contracts/development.json` 
and node RPC is listening at port 8585 by default.

Dungeon keys are generated to `.claimKeys`, local environment always generates same keys.

## Tests

Contract unit test can be run by

```
npm test
```

## Deploy & upgrade

Make sure that the correct mnemonic is set in `.mnemonic` related to the environment.

Staging contracts can be upgraded by

```
deploy:staging-matic
```

Production (alpha)

```
deploy:alpha
```

Information about deployments are stored in `deployments/`, deploy scripts always try to upgrade
contracts, only case when the contracts are newly deployed are if the data about particular environment are not present.

After upgrade the new contract information has to be commited immediately and relevant backend and frontend redeployed from that commit.
