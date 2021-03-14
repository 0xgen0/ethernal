FROM node:12

WORKDIR /usr/src/app

ARG COMMIT
ARG ENV

ENV COMMIT=$COMMIT
ENV ENV=$ENV

COPY package*.json ./
RUN npm install
COPY src src/

EXPOSE 3399
CMD ["node","src/server.js"]
