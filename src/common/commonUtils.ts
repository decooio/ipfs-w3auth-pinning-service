/**
 * @auther zhouzibo
 * @date 2021/9/6
 */
import * as moment from 'moment';
import BigNumber from 'bignumber.js';
import {v4 as uuidv4} from 'uuid';

export const fromDecimal = (amount: number | string) => {
  const amountBN = new BigNumber(amount);
  return amountBN.multipliedBy(new BigNumber(1_000_000_000_000));
};

export function parserStrToObj(str: any) {
  if (!str) {
    return null;
  } else {
    return JSON.parse(JSON.stringify(str));
  }
}

export enum TextMatchingStrategy {
  exact = 'exact',
  iexact = 'iexact',
  partial =  'partial',
  ipartial = 'ipartial',
};

export type PinCommonStatus = 'queued' | 'pinning' | 'pinned' | 'failed';

export enum PinObjectStatus {
  queued = 'queued',
  pinning = 'pinning',
  pinned = 'pinned',
  failed = 'failed',
};

export enum PinFilePinStatus {
  queued = 0,
  pinning,
  pinned,
  failed
}

export enum PinFileLocalPinStatus {
  unpin = 0,
  pinning = 1,
  pinned,
  failed,
}

export enum PinFileThunderPinStatus {
  unpin = 0,
  pinned
}

export const Deleted = {
  undeleted: 0,
  deleted: 1,
}

export const isDate = (value: string): boolean => {
  return moment(value).isValid();
};

export const getEnv = (value: string, defaultValue: any): any => {
  return process.env[value] || defaultValue;
};

export const uuid = (): string => {
  return `${uuidv4()}-${new Date().getTime()}`;
};

export function sleep(time: number) {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}
