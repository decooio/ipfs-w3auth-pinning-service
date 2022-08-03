import {PinFile} from "../../models/PinFile";
import {Deleted, PinFileLocalPinStatus, PinFileThunderPinStatus, sleep} from "../../common/commonUtils";
import * as _ from "lodash";
import {logger} from "../../logger";
import {sequelize} from "../../db/db";
import {Transaction} from "sequelize";
import {configs} from "../../config/config";
import {pinAdd, pinLs} from "../../common/ipfsUtils";
import {sendMarkdown} from "../../common/dingtalkUtils";

export async function batchPinFiles() {
    let threads = [];
    for (let i = 0; i < configs.ipfs.addBatchThreadSize; i++) {
        threads.push(pinFilesToLocal());
    }
    await Promise.all([threads]);
}

export async function pinFilesToLocal() {
    while (true) {
        const pinFile = await sequelize.transaction(async (transaction: Transaction) => {
            const pinFile = await PinFile.findOne({
                where: {
                    local_pin_status: PinFileLocalPinStatus.unpin,
                    deleted: Deleted.undeleted
                },
                lock: transaction.LOCK.UPDATE,
                limit: 1,
                transaction
            });
            if (!_.isEmpty(pinFile)) {
                await PinFile.update({
                    local_pin_status: PinFileLocalPinStatus.pinning
                },{
                    where: {
                        id: pinFile.id
                    },
                    transaction
                })
            }
            return pinFile;
        });
        if (!_.isEmpty(pinFile)) {
            // Check pin stat
            const ipfsLocalHost = configs.ipfs.hostLocal;
            const ipfsThunderHost = configs.ipfs.hostThunder;
            const pinStat = await pinLs(ipfsLocalHost, pinFile.cid);
            if (_.isEmpty(pinStat)) {
                // Query thunder state
                const thunderPinStat = await pinLs(ipfsThunderHost, pinFile.cid);
                // Pin add
                const addResult = await pinAdd(ipfsLocalHost, pinFile.cid);
                const localPinStatus = _.isEmpty(addResult) ? ((pinFile.local_pin_retry_times + 1) > configs.ipfs.addRetryTimes ? PinFileLocalPinStatus.unpin : PinFileLocalPinStatus.failed) : PinFileLocalPinStatus.pinned;
                await PinFile.update({
                    local_pin_status: localPinStatus,
                    local_pin_retry_times: _.isEmpty(addResult) ? (pinFile.local_pin_retry_times + 1) : pinFile.local_pin_retry_times,
                    thunder_pin_status: _.isEmpty(thunderPinStat) ? PinFileThunderPinStatus.unpin : PinFileThunderPinStatus.pinned
                },{
                    where: {
                        id: pinFile.id
                    },
                });
                if (localPinStatus == PinFileLocalPinStatus.failed) {
                    await sendMarkdown('Pin file failed', `Baitech pinner pin add file(${pinFile.cid}) failed after ${configs.ipfs.addRetryTimes} times`);
                }
            } else {
                await PinFile.update({
                    local_pin_status: PinFileLocalPinStatus.pinned
                },{
                    where: {
                        id: pinFile.id
                    },
                });
            }
        }
        await sleep(300);
    }
}


