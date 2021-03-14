FROM node:12 AS build

WORKDIR /app

ADD package*.json .
# Using NPM here due to issue with ethers or portis version
RUN npm install
ADD . .

ARG ENV
ARG SENTRY_DSN
ARG COMMIT

RUN yarn build

FROM node:12-alpine

COPY --from=build /app/dungeon-test/public/ ./

RUN yarn add serve-handler
COPY scripts/heroku.js server.js
CMD ["node", "server.js"]
