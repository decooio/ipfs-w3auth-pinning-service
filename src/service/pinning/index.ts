import {PinObjects} from '../../models/PinObjects';
import {
  uuid,
  fromDecimal,
  Deleted,
  PinFilePinStatus,
  PinFileLocalPinStatus
} from '../../common/commonUtils';
import {configs} from '../../config/config';
import {
  placeOrder,
  getOrderState,
  checkAccountBalanceAndWarning,
} from '../crust/order';
import createKeyring from '../crust/krp';
const moment = require('moment');
const _ = require('lodash');
import {logger} from '../../logger';
import {timeoutOrError} from '../../common/promise-utils';
import {PinFile} from "../../models/PinFile";
import {sequelize} from "../../db/db";
import {Transaction} from "sequelize";
import {Pin, PinStatus} from "../../types/pinObjects";
import {ApiPromise, WsProvider} from "@polkadot/api";
import {typesBundleForPolkadot} from "@crustio/type-definitions";
import {sendMarkdown} from "../../common/dingtalkUtils";
const Sequelize = require('sequelize');
const {sleep} = require('../../common/commonUtils');
const pinObjectDao = require('../../dao/pinObjectDao');
const Op = Sequelize.Op;

export async function replacePin(
  userId: number,
  requestId: string,
  pin: Pin
): Promise<PinStatus> {
  await pinObjectDao.deletePinObjectByRequestIdAndUserId(requestId, userId);
  return pinByCid(userId, pin);
}

export async function pinByCid(userId: number, pin: Pin): Promise<PinStatus> {
  let pinObjects = await PinObjects.findOne({
    where: {user_id: userId, cid: pin.cid},
  });
  const pinFile = await PinFile.findOne({
    where: {
      cid: pin.cid
    }
  });
  const obj = {
    name: pin.name ? pin.name : pin.cid,
    request_id: uuid(),
    user_id: userId,
    cid: pin.cid,
    meta: pin.meta,
    origins: [...pin.origins].join(','),
    delegates: configs.ipfs.delegates.join(','),
    deleted: Deleted.undeleted,
    update_time: moment().format('YYYY-MM-DD HH:mm:ss')
  };
  const pinFileObj = {
    cid: pin.cid,
    pin_status: PinFilePinStatus.queued,
    order_retry_times: 0,
    local_pin_status: PinFileLocalPinStatus.unpin,
    local_pin_retry_times: 0,
    thunder_pin_status: PinFileLocalPinStatus.unpin,
    deleted: Deleted.undeleted,
    update_time: moment().format('YYYY-MM-DD HH:mm:ss')
  };
  const resetPinFile = pinFile.deleted === Deleted.deleted || pinFile.pin_status === PinFilePinStatus.failed;
  const pinStatus = (_.isEmpty(pinFile) || resetPinFile) ? PinFilePinStatus.queued : pinFile.pin_status;
  await sequelize.transaction(async (transaction: Transaction) => {
    if (_.isEmpty(pinFile)) {
      await PinFile.create(pinFileObj, {transaction})
    } else if (resetPinFile){
      await PinFile.update(pinFileObj, {
        where: {
          id: pinFile.id
        },
        transaction
      })
    }
    if (_.isEmpty(pinObjects)) {
      pinObjects = await PinObjects.create(obj, {transaction});
    } else {
      await PinObjects.update(obj, {
        where: {
          id: pinObjects.id
        },
        transaction
      })
    }
  })
  return PinStatus.parseBaseData({
    ...pinObjects,
    ...obj,
    status: pinStatus
  });
}

export async function orderStart() {
  const api = new ApiPromise({
    provider: new WsProvider(configs.crust.chainWsUrl),
    typesBundle: typesBundleForPolkadot,
  });
  let loopTimeAwait = configs.crust.loopTimeAwait;
  for (;;) {
    try {
      const checkAccount = await checkAccountBalanceAndWarning(api);
      if (!checkAccount) {
        await sleep(configs.crust.loopTimeAwait);
        continue;
      }
      const hasFileToSave = await placeOrderQueuedFiles().catch(e => {
        logger.error(`place order queued files failed: ${e.message}`);
      });
      loopTimeAwait = hasFileToSave ? configs.crust.loopTimeAwait : (loopTimeAwait + configs.crust.loopTimeAwait);
      await sleep(_.min([loopTimeAwait, 1000 * 60 * 2]));
    } catch (e) {
      logger.error(`place order loop error: ${e.message}`);
      await sendMarkdown(`Baitech pinner (${configs.server.name}) error`, `### crust-pinner(${configs.server.name}) error \n err msg: ${e.message}`);
      await sleep(configs.crust.loopTimeAwait);
    }
  }
}

async function placeOrderQueuedFiles(): Promise<boolean> {
  logger.info('start placeOrderQueuedFiles');
  const pinFiles = await PinFile.findAll({
    where: {
      deleted: 0,
      [Op.or]: [
        {pin_status: PinFilePinStatus.failed},
        {pin_status: PinFilePinStatus.queued},
      ],
      order_retry_times: {
        [Op.lt]: configs.crust.orderRetryTimes,
      },
    },
    order: [['update_time', 'asc']],
    limit: 1000
  });
  if (_.isEmpty(pinFiles)) {
    logger.info('not pin files to order');
    return false;
  }
  for (const file of pinFiles) {
    const cid = file.cid;
    if (file.order_retry_times < configs.crust.orderRetryTimes) {
      try {
        await placeOrderInCrust(cid, file.order_retry_times);
        await sleep(configs.crust.orderTimeAwait);
      } catch (e) {
        logger.error(`order error catch: ${e.stack} cid: ${cid}`);
        await sendMarkdown(`Baitech order (${configs.server.name}) failed`, `Place order in crust failed cid(${cid}): ${e.message}`);
        await sleep(configs.crust.orderFailedTimeAwait)
      }
    } else {
      await PinFile.update(
        {
          pin_status: PinFilePinStatus.failed,
        },
        {
          where: {
            id: file.id,
          },
        }
      );
      await sendMarkdown(`Baitech order (${configs.server.name}) failed`, `Place order in crust failed cid(${cid}) after ${configs.crust.orderRetryTimes} times`);
    }
  }
  return true;
}

async function placeOrderInCrust(cid: string, retryTimes = 0) {
  const api = new ApiPromise({
    provider: new WsProvider(configs.crust.chainWsUrl),
    typesBundle: typesBundleForPolkadot,
  });
  let pinStatus = PinFilePinStatus.pinning;
  let retryTimeAdd = false;
  try {
    const fileCid = cid;
    const fileSize = configs.crust.defaultFileSize;
    const seeds = configs.crust.seed;
    const tips = configs.crust.tips;
    const krp = createKeyring(seeds);
    logger.info(`order cid: ${cid} in crust`);
    pinStatus = PinFilePinStatus.pinning;
    const res = await timeoutOrError(
      'Crust place order',
      placeOrder(
        api,
        krp,
        fileCid,
        fileSize,
        fromDecimal(tips).toFixed(0),
        undefined
      ),
      configs.crust.transactionTimeout
    );
    if (!res) {
      retryTimeAdd = true;
      pinStatus = PinFilePinStatus.failed;
      logger.error(`order cid: ${cid} failed result is empty`);
    }
  } catch (e) {
    pinStatus = PinFilePinStatus.failed;
    retryTimeAdd = true;
    logger.error(`order cid: ${cid} failed error: ${e.toString()}`);
  } finally {
    const times =
      retryTimeAdd && retryTimes < configs.crust.orderRetryTimes
        ? retryTimes + 1
        : retryTimes;
    await PinFile.update(
      {
        pin_status: pinStatus,
        order_retry_times: times,
      },
      {
        where: {
          cid: cid,
        },
      });
  }
}

export async function updatePinObjectStatus() {
  const api = new ApiPromise({
    provider: new WsProvider(configs.crust.chainWsUrl),
    typesBundle: typesBundleForPolkadot,
  });
  const pinningObjects = await PinFile.findAll({
    where: {pin_status: PinFilePinStatus.pinning, deleted: 0},
  });
  if (!_.isEmpty(pinningObjects)) {
    for (const obj of pinningObjects) {
      try {
        const res = await getOrderState(api, obj.cid);
        if (res) {
          if (
            res.meaningfulData.reported_replica_count >=
            configs.crust.validFileSize
          ) {
            obj.pin_status = PinFilePinStatus.pinned;
            obj.file_size = res.meaningfulData.file_size;
            obj.calculated_at = res.meaningfulData.calculated_at;
            obj.expired_at = res.meaningfulData.expired_at;
            obj.replica_count = res.meaningfulData.reported_replica_count;
          } else {
            obj.pin_status = PinFilePinStatus.pinning;
          }
        } else {
          // invalid file size
          obj.deleted = 1;
          obj.pin_status = PinFilePinStatus.failed;
          await sendMarkdown(`Baitech order (${configs.server.name}) failed`, `Can not query pinning file cid(${obj.cid}) from crust chain please check!`);
        }
        await obj.save();
      } catch (e) {
        logger.error(`get order state err: ${e}`);
      }
    }
  }
}
