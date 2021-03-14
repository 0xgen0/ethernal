// eslint-disable-next-line import/no-unresolved
const handler = require('serve-handler');
const http = require('http');

const { PORT = 3000 } = process.env;

const server = http.createServer((req, res) => {
  const proto = req.headers['x-forwarded-proto'];
  if (proto && proto !== 'https') {
    res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
    return res.end();
  }

  return handler(req, res, {
    rewrites: [
      {
        source: '**',
        destination: '/index.html',
      },
    ],
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Running server on port ${PORT}…`);
});
