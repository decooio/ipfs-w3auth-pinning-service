import axios from "axios";
import {logger} from "../logger";
import {configs} from "../config/config";

const http = axios.create();
http.defaults.timeout = 5000;

export async function pinLs(host: string, cid: string) {
    try {
        const result = await http.request({
            url: `${host}/api/v0/pin/ls?arg=/ipfs/${cid}`,
            method: 'POST',
            headers: { Authorization: `Basic ${configs.ipfs.thunderAuthSignature}` },
        });
        return result;
    } catch (e) {
        logger.error(`Call ipfs pin ls (${host}) failed: ${e.message}`);
        return null;
    }
}

export async function pinAdd(host: string, cid: string) {
    try {
        const result = await http.post(`${host}/api/v0/pin/add?arg=/ipfs/${cid}`, {
            timeout: configs.ipfs.ipfsPinAddTimeOut
        });
        return result;
    } catch (e) {
        logger.error(`Call ipfs pin add failed: ${e.message}`);
        return null;
    }
}
