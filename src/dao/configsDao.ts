import * as _ from 'lodash';
const commonDao = require('./commonDao');
import { Transaction } from 'sequelize';

export async function queryForStr(
  key: string,
  defaultValue: string
): Promise<string> {
  const config = await commonDao.queryForObj(
    'select `value` from configs where `key` = ?',
    [key]
  );
  return !_.isEmpty(config) ? config.value : defaultValue;
}

export async function updateStr(key: string, value: string) {
  return updateByStr(key, value);
}

export async function replaceStr(key: string, value: string) {
  return commonDao.queryForUpdate(
    'INSERT INTO configs ( `key`, `value` ) VALUES ( ?, ? ) \
  ON DUPLICATE KEY UPDATE `value` = ?, last_update_at = NOW()',
    [key, value, value],
  );
}

export async function updateByStr(key: string, value: string) {
  const config = await commonDao.queryForObj(
    'select `value` from configs where `key` = ?',
    [key]
  );
  if (!_.isEmpty(config)) {
    return commonDao.queryForUpdate(
      'UPDATE configs set `value` = ?, last_update_at = NOW() where `key` = ?',
      [value, key],
    );
  } else {
    return replaceStr(key, value);
  }
}
