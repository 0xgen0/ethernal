const environments = {
  dev: {
    primary: 'http://localhost:3399',
    servers: ['http://localhost:3399', 'http://localhost:3400']
  },
  staging: {
    primary: 'https://ethernal.dev.tmcloud.id',
    servers: ['https://ethernal.dev.tmcloud.id', 'https://ethernal2.dev.tmcloud.id']
  },
  prod: {
    primary: 'https://ethernal.prod.tmcloud.id',
    servers: ['https://ethernal.prod.tmcloud.id', 'https://ethernal2.prod.tmcloud.id']
  }
}

const getPrimaryServer = (env = process.env.ENV || 'dev') => {
  return process.env.PRIMARY_SERVER || environments[env].primary;
}

module.exports = {environments, getPrimaryServer};
