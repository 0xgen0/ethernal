FROM node:11 AS build

WORKDIR /app

ADD package.json .
ADD yarn.lock .
RUN yarn
ADD . .
RUN yarn build

FROM swarmpit/http-server

COPY --from=build /app/public/ ./

