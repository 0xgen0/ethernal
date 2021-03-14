FROM node:11 AS build

WORKDIR /app

ADD package*.json ./
RUN npm install
ADD . .
RUN npm run build

FROM node:11-slim

ADD package*.json ./
RUN npm install --only=prod
COPY --from=build /app/public/ ./public

CMD ["npm", "run", "start"]
