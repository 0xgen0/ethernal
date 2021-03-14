# Ethernal backend

Backend is node app connected with priviled access to the contracts with ethers.js and communicates with the
frontend clients with socket.io events and also exposes simple REST api.

## How to run

Install dependencies

```
nvm use
npm install
```

Start local database server in Docker

```
npm run db
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

Backend startup can take long time depending on the environment chosen and on how synced is local database.

Backend is synced and ready when
https://localhost:3399 returns `ethernalCache: 'ok'`

## Tests

Backend unit test can be run by

```
npm test
```

## Deploy

Prerequisites: heroku cli, docker

You have to be logged in in heroku cli first.

Deploy `staging` environment (https://ethernal-be-alpha.herokuapp.com)
```
npm run deploy:staging
```

Deploy `production` environment (https://ethernal-cache-1.herokuapp.com)
```
npm run deploy:prod1
```

Deploy alternative `production` environment (https://ethernal-cache-2.herokuapp.com)
```
npm run deploy:prod2
```

## Reindex Database

Both production backend are connected to the same database, to which scheme they write is specified by `SCHEMA_PREFIX`
environment variable.

This way we can have one backend using one scheme and other one indexing another from scratch. Reindexing database takes long time
so it is important to reindex always in advance and only if really necessary.

When second scheme is synced, default scheme can be replaced like so:

```
ALTER SCHEMA primary RENAME TO backup
ALTER SCHEMA secondary RENAME TO primary;
```

This change can be done live with primary and secondary backend running, but if for some reason would be necessary to switch back to
backup, the primary backend has to be stopped before switch. Also primary backend has to be switched if the secondary backend is not running during the switch.
If the redeploy of the primary backend is necessary switch should be executed during the downtime.

### Reset local database

To force local reindex of database, the scheme can be just deleted or the whole database cleared by running:
 
```
npm run db:reset
```

## Change admin wallet

Admin wallet can be rotated by specifying both `MNEMONIC` and `OLD_MNEMONIC` (current admin) environment variables.
