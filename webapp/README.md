# Ethernal frontend

Ethernal frontend is SPA based on Svelte framework. It is connected to the smart contracts through ethers.js
and communicates with backend by using socket.io

User actions are usually sent through wallet as an transaction, when transaction is accepted, backend that listens to
the blockchain triggers event notifying all relevant frontend clients with the result.

## How to run

Install the dependencies

```
nvm use
npm install
```

Start `local` webapp, this requires local contracts and backend running as well.

```
npm run dev
```

Start `staging` webapp connected to the deployed staging environment (backend and contracts)

```
npm run dev-staging-contracts
```

Start `prod` webapp connected to the deployed production environment (backend and contracts)

```
npm run dev-prod-contracts
```

Navigate to [localhost:8080](http://localhost:8080). You should see your app running.

To actually start playing you have to use `#dungeonKey` hash parameter.
When you run contracts locally these keys can be found in `../contracts/.claimKeys`

By default [Portis](https://www.portis.io/) wallet will be used, alternatively burn wallet (store in local storage) can
be used by adding `?useLocalKey=true` query param.

Example of url using burn wallet with dungeon key from `.claimKeys` file:

http://localhost:8080/?useLocalKey=true#dungeonKey=0xee817c4bd0ed417a07bd49b8d94efaf58ed75897c4059846fa9bcf564f59cd4c

## Deployment to Heroku

You have to have `docker` and `heroku` cli installed.

Deploy staging environment [dev.ethernal.world](https://dev.ethernal.world)

```
npm run deploy:staging
```

Deploy staging frontend that uses production backend to [dev.ethernal.world](https://dev.ethernal.world)

```
npm run deploy:prod@staging
```

Deploy production environment [alpha.ethernal.world](https://alpha.ethernal.world)

```
npm run deploy:prod
```

## Prettier

The webapp comes configured with Prettier formattion options. Your IDE is likely to pick these up automatically.

If you need to invoke manually, you can use the following command to clean up all files in the webapp folder.

```
npx prettier --write '**/*'`
```

You can change `'**/*'` to a restricted path or folder.

## ESLint

You can use ESLint to identify code quality issues and other suggested changes. To invoke, simply run `npm run lint` to see output for the webapp folder.

To run for a specific folder or file, run as `npx eslint --ext js --ext svelte PATH` (where PATH is the file or folder to lint).
