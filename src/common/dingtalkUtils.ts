import * as _ from 'lodash';

import { configs } from '../config/config';
import { getEnv } from './commonUtils';
import {logger} from "../logger";

const axios = require('axios');
const crypto = require('crypto');

export async function sendMarkdown(
    title: string,
    text: string
) {
    try {
        const time = Date.now();
        const secret = configs.dingtalk.notificationSecret;
        const notificationUrl = configs.dingtalk.notificationUrl;
        const hmacCode = crypto
            .createHmac('sha256', secret)
            .update(`${time}\n${secret}`)
            .digest('base64');
        const sign = encodeURIComponent(hmacCode);
        const url = `${notificationUrl}&timestamp=${time}&sign=${sign}`;

        await axios.request({
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            method: 'POST',
            url,
            data: {
                msgtype: 'markdown',
                markdown: {
                    title,
                    text: `${text}(${getEnv('NODE_ENV', 'dev')})`,
                },
            },
        });
    } catch (error) {
        logger.error(
            `Error sending Dingtalk notification. ${error.message}`,
            error.stack
        );
    }
}
