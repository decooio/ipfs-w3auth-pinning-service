const {getEnv} = require('../common/commonUtils');
const _ = require('lodash');

export const configs = {
  isDev: getEnv('NODE_ENV', 'dev').indexOf('prod') < 0,
  db: {
    host: getEnv('MYSQL_HOST', 'localhost'),
    port: _.parseInt(getEnv('MYSQL_PORT', 23306)),
    db: getEnv('MYSQL_DB', 'pinning_service'),
    user: getEnv('MYSQL_USER', 'root'),
    password: getEnv('MYSQL_PASSWORD', 'root'),
    db_pool_max: _.parseInt(getEnv('MYSQL_POOL_MAX', 10)),
    db_pool_min: _.parseInt(getEnv('MYSQL_POOL_MIN', 0)),
    db_pool_idle: _.parseInt(getEnv('MYSQL_POOL_IDLE', 30000)),
    db_pool_acquire: _.parseInt(getEnv('MYSQL_POOL_ACQUIRE', 30000)),
  },
  ipfs: {
    delegates: [] as string[],
    hostLocal: getEnv('IPFS_HOST_LOCAL', 'http://localhost:5001'),
    hostThunder: getEnv('IPFS_HOST_THUNDER', 'http://localhost:5001'),
    ipfsPinAddTimeOut: _.parseInt(getEnv('IPFS_PIN_ADD_TIMEOUT', 1000 * 60 * 60 * 1)),
    addBatchThreadSize: _.parseInt(getEnv('PIN_ADD_THREAD_SIZE', 5)),
    addRetryTimes: _.parseInt(getEnv('IPFS_PIN_ADD_RETRY_TIMES', 3)),
    thunderAuthSignature: getEnv('IPFS_THUNDER_AUTH_SIGNATURE', ''),
  },
  evolution: {
    schema_table: 'data_migrations',
    location: '/migrations',
  },
  crust: {
    seed: getEnv('CRUST_SEED', ''),
    chainWsUrl: getEnv('WS_ENDPOINT', 'wss://rpc.crust.network'),
    defaultFileSize: _.parseInt(getEnv('DEFAULT_FILE_SIZE', 2147483648)),
    tips: getEnv('CRUST_TIPS', 0),
    validFileSize: _.parseInt(getEnv('VALID_FILE_REPLICAS', 30)),
    orderTimeAwait: _.parseInt(getEnv('ORDER_TIME_AWAIT', 3000)),
    orderFailedTimeAwait: _.parseInt(getEnv('ORDER_FAILED_TIME_AWAIT', 60000)),
    loopTimeAwait: _.parseInt(getEnv('LOOP_TIME_AWAIT', 2000)),
    checkAmountTimeAwait: _.parseInt(getEnv('CHECK_AMOUNT_TIME_AWAIT', 120000)),
    checkAmountRetryTimes: _.parseInt(getEnv('CHECK_AMOUNT_RETRY_TIMES', 3)),
    orderRetryTimes: _.parseInt(getEnv('ORDER_RETRY_TIMES', 3)),
    minimumAmount: _.parseInt(getEnv('MINIMUM_AMOUNT', 1)),
    transactionTimeout: _.parseInt(getEnv('TRANSACTION_TIMEOUT', 60 * 1000)),
  },
  dingtalk: {
    notificationUrl: getEnv('WARNING_URL', ''),
    notificationSecret: getEnv('WARNING_SECRET', ''),
  },
  server: {
    port: 3000,
    name: getEnv('NODE_ENV', 'prod'),
  },
};
