console.log('starting server-list');
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');

const {getPrimaryServer} = require('./list');

const { PORT = 3366 } = process.env;
const app = express();

app.use(cors({
  origin: (origin, callback) => callback(null, true),
}));

app.get('/', (req, res) => {
  res.send(getPrimaryServer());
});

async function start() {
  console.log('primary server', getPrimaryServer());
  const server = http.createServer(app);
  const listener = server.listen(PORT, async () => {
    const { port } = listener.address();
    console.log('server-list ready and running on port', port);
  });
}

start().catch(async err => {
  console.log(err);
  Sentry.captureException(err);
  await Sentry.close();
  process.exit(1);
});

