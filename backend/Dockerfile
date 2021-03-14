FROM node:12

WORKDIR /usr/src/app

ARG COMMIT

ENV COMMIT=$COMMIT
ENV HEROKU_SLUG_COMMIT=$COMMIT
ENV ETH_URL="https://sokol.poa.network"

COPY package*.json ./
RUN npm install
COPY src src/

EXPOSE 3399
CMD ["node","src/server.js"]
