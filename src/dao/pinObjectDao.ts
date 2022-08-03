import {PinObjects} from '../models/PinObjects';
import {sequelize} from "../db/db";
import {Op, Transaction} from "sequelize";
import {Deleted, sleep} from "../common/commonUtils";
const moment = require('moment');
import {PinFile} from "../models/PinFile";
import {PinObjectsQuery, PinResults, PinStatus} from "../types/pinObjects";
const {TextMatchingStrategy} = require('../common/commonUtils');
const _ = require('lodash');
const commonDao = require('./commonDao');
const pinObjectDao = {
  selectPinObjectListByQuery,
  deletePinObjectByRequestIdAndUserId,
  selectPinObjectByRequestIdAndUserId,
};

async function deletePinObjectByRequestIdAndUserId(
  requestId: string,
  userId: number
) {
  const existObj = await PinObjects.findOne({
    attributes: ['id', 'cid', 'deleted'],
    where: {
      user_id: userId,
      request_id: requestId
    }
  });
  if (!_.isEmpty(existObj) && existObj.deleted === Deleted.undeleted) {
    await sequelize.transaction(async (transaction: Transaction) => {
      const unDeletedObj = await PinObjects.findOne({
        attributes: ['id'],
        lock: transaction.LOCK.UPDATE,
        where: {
          cid: existObj.cid,
          deleted: Deleted.undeleted,
          id: {
            [Op.ne]: existObj.id
          }
        },
        order: [
            ['id', 'asc']
        ],
        limit: 1,
        transaction
      })
      await PinObjects.update({
        deleted: Deleted.deleted,
        update_time: moment().format('YYYY-MM-DD HH:mm:ss')
      }, {
        where: {
          id: existObj.id
        },
        transaction
      });
      if (_.isEmpty(unDeletedObj)) {
        await PinFile.update({
          deleted: Deleted.deleted,
          update_time: moment().format('YYYY-MM-DD HH:mm:ss')
        }, {
          where: {
            cid: existObj.cid
          },
          transaction
        });
      }
    });
  }
}

async function selectPinObjectByRequestIdAndUserId(
  requestId: string,
  userId: number
): Promise<PinStatus> {
  const result = await commonDao.queryForObj(
    `select pin_object.*, pin_file.pin_status as 'status' from pin_object join pin_file on pin_object.cid = pin_file.cid where pin_object.deleted = 0 and pin_object.user_id = ? and pin_object.request_id = ?`,
    [userId, requestId]
  );
  if (!_.isEmpty(result)) {
    return PinStatus.parseBaseData(result);
  } else {
    return null;
  }
}

async function selectPinObjectListByQuery(
  query: PinObjectsQuery
): Promise<PinResults> {
  const count = await selectPinObjectCountByQuery(query);
  const pinResult = new PinResults();
  pinResult.count = count;
  if (count > 0) {
    const [sql, args] = parsePinObjectQuery(
      query,
      `select pin_object.*, pin_file.pin_status as 'status' from pin_object join pin_file on pin_object.cid = pin_file.cid where pin_object.deleted = ${Deleted.undeleted} and pin_object.user_id = ?`,
      [query.userId]
    );
    const result = await commonDao.queryForArray(sql, args);
    pinResult.results = _.map(result, (i: any) => PinStatus.parseBaseData(i));
  } else {
    pinResult.results = [];
  }
  return pinResult;
}

function selectPinObjectCountByQuery(query: PinObjectsQuery): Promise<number> {
  const [sql, args] = parsePinObjectQuery(
    query,
    `select count(*) from pin_object join pin_file on pin_object.cid = pin_file.cid where pin_object.deleted = ${Deleted.undeleted} and pin_object.user_id = ?`,
    [query.userId]
  );
  return commonDao.queryForCount(sql, args);
}

function parsePinObjectQuery(
  query: PinObjectsQuery,
  baseSql: string,
  baseArgs: any[]
): [string, any[]] {
  let sql = baseSql;
  let args = baseArgs;
  if (query.cid) {
    if (_.isArray(query.cid)) {
      sql = `${sql} and pin_object.cid in (${_.map(query.cid, () => '?').join(',')})`;
    } else {
      sql = `${sql} and pin_object.cid = ?`;
    }
    args = _.concat(args, query.cid);
  }
  if (query.after) {
    sql = `${sql} and pin_object.create_time >= ?`;
    args.push(query.after);
  }
  if (query.before) {
    sql = `${sql} and pin_object.create_time <= ?`;
    args.push(query.before);
  }
  if (query.status) {
    if (_.isArray(query.status)) {
      sql = `${sql} and pin_file.pin_status in (${_.map(query.status, () => '?').join(
        ','
      )})`;
    } else {
      sql = `${sql} and pin_file.pin_status = ?`;
    }
    args = _.concat(args, query.status);
  }
  if (query.name) {
    sql = `${sql} and pin_object.\`name\` = ?`;
    args.push(query.name);
  }
  if (query.meta && query.meta.size > 0) {
    const metaSql: string[] = [];
    query.meta.forEach((value: string, key: string) => {
      let queryValue = value;
      if (query.match === TextMatchingStrategy.iexact) {
        queryValue = `"${value}"`;
        metaSql.push('UPPER(pin_object.meta->?)=UPPER(?)');
      } else if (query.match === TextMatchingStrategy.partial) {
        queryValue = `%${value}%`;
        metaSql.push('pin_object.meta->? like ?');
      } else if (query.match === TextMatchingStrategy.ipartial) {
        queryValue = `%${value}%`;
        metaSql.push('UPPER(pin_object.meta->?) like UPPER(?)');
      } else {
        metaSql.push('pin_object.meta->?=?');
      }
      args.push(`$.${key}`, queryValue);
    });
    sql = `${sql} and (${metaSql.join(' and ')})`;
  }
  if (query.limit) {
    sql = `${sql} limit ?`;
    args.push(query.limit);
  }
  return [sql, args];
}

module.exports = pinObjectDao;
