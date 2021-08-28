# Ethernal backend

Backend is node app connected with priviled access to the contracts with ethers.js and communicates with the
frontend clients with socket.io events and also exposes simple REST api.

## How to run

Install dependencies

```
nvm use
npm install
```

Start `local` backend connected to the local contracts

```
npm run dev
```

This will copy `../webapp/contracts/development.json` and launch nodemon - if contracts are redeployed, 
backend has to be restarted or new contracts info copied manually.

To be able to run `staging` or `production` contracts `.env` file has to be filled with corresponding mnemonic and AWS vars.

Start `staging` backend connected to the staging contracts

```
npm run dev:staging
```

Start `production` backend connected to the production contracts

```
npm run dev:prod
```

Backend startup can take few minutes depending on the environment chosen 
and is ready to accept requests when this message appears:
```
ethernal-cache ready and running on port 3399
```

https://localhost:3399 should then return `ethernalCache: 'ok'`

Live map preview is at http://localhost:3399/map.html

## Deploy

Prerequisites: heroku cli, docker

You have to be logged in in heroku cli first.

Deploy `staging` environment (https://ethernal-be-alpha.herokuapp.com)
```
npm run deploy:staging
```

Deploy `staging-tmcloud` alternative environment (https://ethernal.dev.tmcloud.io)
```
npm run deploy:staging-tmcloud
npm run deploy:staging
```

Deploy `production` environment (https://ethernal-be-alpha-live.herokuapp.com)
```
npm run deploy:prod
```

Deploy `prod-tmcloud` alternative environment (https://ethernal.prod.tmcloud.io)
```
docker login -u lumir
npm run deploy:prod
```

## Change admin wallet

Admin wallet can be rotated by specifying both `MNEMONIC` and `OLD_MNEMONIC` (current admin) environment variables.
