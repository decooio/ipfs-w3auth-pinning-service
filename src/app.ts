import * as express from 'express';
import * as cors from 'cors';
import {router as psaRouter} from './routes/psa';
import * as bodyParser from 'body-parser';
const pinningAuthHandler = require('./middlewares/auth/authHandler');
const w3authHandler = require('@crustio/ipfs-w3auth-handler');
const schedule = require('node-schedule');
const Postgrator = require('postgrator');
const moment = require('moment');
const path = require('path');
import {updatePinObjectStatus, orderStart, inputExpireFilesToQueued} from './service/pinning';
import {logger} from './logger';
import {configs} from './config/config';
import {batchPinFiles} from "./service/ipfs";
import {sendMarkdown} from "./common/dingtalkUtils";
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(w3authHandler);
app.use('/psa', pinningAuthHandler, psaRouter);

const postgrator = new Postgrator({
  migrationDirectory: path.join(__dirname, configs.evolution.location),
  schemaTable: configs.evolution.schema_table,
  driver: 'mysql2',
  host: configs.db.host,
  port: configs.db.port,
  database: configs.db.db,
  username: configs.db.user,
  password: configs.db.password,
});

postgrator.migrate('max').then((migrations: any) => {
  app.listen(configs.server.port);
});

const pinStatusUpdateJob = schedule.scheduleJob('0 */20 * * * *', () => {
  logger.info('pin status schedule start');
  updatePinObjectStatus()
    .then(() => {
      logger.info('pin status schedule finished');
    })
    .catch((e: Error) => {
      logger.error(`pin status update err: ${e.stack}`);
    });
});
pinStatusUpdateJob.invoke();

batchPinFiles().catch((e: Error) => {
  logger.error(`batch pin file err: ${e.stack}`);
  sendMarkdown('Pin file failed', `Baitech pinner pin add job crushed please check!`);
});

orderStart().catch((e: Error) => {
  logger.error(`order status err: ${e.stack}`);
  sendMarkdown('Order file failed', `Baitech pinner order job crushed please check!`);
});

inputExpireFilesToQueued().catch((e: Error) => {
  logger.error(`re order expire files err: ${e.stack}`);
  sendMarkdown('ReOrder file failed', `Reorder expire file failed: ${e.message}`);
})
