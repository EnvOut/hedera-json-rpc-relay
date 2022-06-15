/*-
 *
 * Hedera JSON RPC Relay
 *
 * Copyright (C) 2022 Hedera Hashgraph, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import {expect} from "chai";

export default class Assertions {
    static assertId = (id) => {
        const [shard, realm, num] = id.split('.');
        expect(shard).to.not.be.null;
        expect(realm).to.not.be.null;
        expect(num).to.not.be.null;
    };

    static failedResponce = (resp: any) => {
        expect(resp).to.have.property('error');
    };

    static unsupportedResponse = (resp: any) => {
        Assertions.failedResponce(resp);
        expect(resp.error.code).to.eq(-32601);
        expect(resp.error.message).to.eq('Unsupported JSON-RPC method');
    };

    static expectedError = () => {
        expect(true).to.eq(false);
    };

    static transactionReceipt = (transactionReceipt, transactionRequest, overwriteValues = {}) => {
        const staticValues = {
            status: '0x1',
            logs: [],
            from: '',
            ...overwriteValues
        };

        expect(transactionReceipt.blockHash).to.exist;
        expect(transactionReceipt.blockHash).to.not.eq('0x0');
        expect(transactionReceipt.blockNumber).to.exist;
        expect(Number(transactionReceipt.blockNumber)).to.gt(0);
        expect(transactionReceipt.cumulativeGasUsed).to.exist;
        expect(Number(transactionReceipt.cumulativeGasUsed)).to.gt(0);
        expect(transactionReceipt.gasUsed).to.exist;
        expect(Number(transactionReceipt.gasUsed)).to.gt(0);
        expect(transactionReceipt.logsBloom).to.exist;
        expect(transactionReceipt.logsBloom).to.not.eq('0x0');
        expect(transactionReceipt.transactionHash).to.exist;
        expect(transactionReceipt.transactionHash).to.not.eq('0x0');
        expect(transactionReceipt.transactionIndex).to.exist;
        expect(transactionReceipt.effectiveGasPrice).to.exist;
        expect(Number(transactionReceipt.effectiveGasPrice)).to.gt(0);
        expect(transactionReceipt.status).to.exist;
        expect(transactionReceipt.logs).to.exist;
        expect(transactionReceipt.logs.length).to.eq(staticValues.logs.length);
        expect(transactionReceipt.status).to.eq(staticValues.status);
        expect(transactionReceipt.from).to.eq(staticValues.from);
        expect(transactionReceipt.to).to.eq(transactionRequest.to);

    };
}