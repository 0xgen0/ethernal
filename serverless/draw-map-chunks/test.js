const childProc = require('child_process');
const fs = require('fs');

// Set ENVs
process.env.CACHE_URL_LOCAL = 'http://localhost:3399'; // localhost
// process.env.CACHE_URL_DEV = 'https://ethernalstaging.prod.tmcloud.io'; // alpha2
process.env.CACHE_URL_DEV = 'https://ethernal-be-alpha.herokuapp.com'; // alpha3
// process.env.CACHE_URL_ALPHA = 'https://ethernal2.prod.tmcloud.io'; // alpha2
process.env.CACHE_URL_ALPHA = 'https://ethernal-be-alpha-live.herokuapp.com'; // alpha3

const { handler } = require('./index');

// const env = 'alpha';
const env = 'dev';
// const env = 'local';
const key = '-1,0,0';
// const key = 'full';
const format = 'png';
// const format = 'svg';

const event = {
  Records: [
    {
      cf: {
        request: {
          headers: {},
          querystring: '',
          uri: `/${env}/map/chunks/${key}.${format}`,
        },
        response: {
          headers: {},
          status: '404', // cache miss, force render
          statusDescription: 'Not found',
        },
      },
    },
  ],
};
const context = {};

return Promise.resolve(handler(event, context)).then(r => {
  console.log(JSON.stringify(r, null, 2));
  const fname = `_output.${format}`;
  fs.writeFileSync(fname, r.body, format === 'png' ? 'base64' : null);
  childProc.exec(`open -a "Google Chrome" ${fname}`);
});
