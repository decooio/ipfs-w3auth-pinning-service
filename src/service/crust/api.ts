import {ApiPromise, WsProvider} from "@polkadot/api";
import {configs} from "../../config/config";
import {typesBundleForPolkadot} from "@crustio/type-definitions";

export const api = new ApiPromise({
    provider: new WsProvider(configs.crust.chainWsUrl),
    typesBundle: typesBundleForPolkadot,
});
