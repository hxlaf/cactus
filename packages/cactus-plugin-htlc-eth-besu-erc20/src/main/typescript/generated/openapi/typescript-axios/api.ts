/* tslint:disable */
/* eslint-disable */
/**
 * Hyperledger Cactus Plugin - HTLC ETH BESU ERC20
 * Allows Cactus nodes to interact with HTLC contracts with ERC-20 Tokens
 *
 * The version of the OpenAPI document: 0.0.1
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


import { Configuration } from './configuration';
import globalAxios, { AxiosPromise, AxiosInstance } from 'axios';
// Some imports not used depending on template conditions
// @ts-ignore
import { DUMMY_BASE_URL, assertParamExists, setApiKeyToObject, setBasicAuthToObject, setBearerAuthToObject, setOAuthToObject, setSearchParams, serializeDataIfNeeded, toPathString, createRequestFunction } from './common';
// @ts-ignore
import { BASE_PATH, COLLECTION_FORMATS, RequestArgs, BaseAPI, RequiredError } from './base';

/**
 * 
 * @export
 * @interface InitializeRequest
 */
export interface InitializeRequest {
    /**
     * connectorId for the connector besu plugin
     * @type {string}
     * @memberof InitializeRequest
     */
    connectorId: string;
    /**
     * keychainId for the keychain plugin
     * @type {string}
     * @memberof InitializeRequest
     */
    keychainId: string;
    /**
     * 
     * @type {Array<any>}
     * @memberof InitializeRequest
     */
    constructorArgs: Array<any>;
    /**
     * 
     * @type {Web3SigningCredential}
     * @memberof InitializeRequest
     */
    web3SigningCredential: Web3SigningCredential;
    /**
     * 
     * @type {number}
     * @memberof InitializeRequest
     */
    gas?: number;
}
/**
 * 
 * @export
 * @interface InvokeContractV1Response
 */
export interface InvokeContractV1Response {
    /**
     * 
     * @type {Web3TransactionReceipt}
     * @memberof InvokeContractV1Response
     */
    transactionReceipt?: Web3TransactionReceipt;
    /**
     * 
     * @type {any}
     * @memberof InvokeContractV1Response
     */
    callOutput?: any | null;
    /**
     * 
     * @type {boolean}
     * @memberof InvokeContractV1Response
     */
    success: boolean;
}
/**
 * 
 * @export
 * @interface NewContractRequest
 */
export interface NewContractRequest {
    /**
     * Contract address
     * @type {string}
     * @memberof NewContractRequest
     */
    contractAddress: string;
    /**
     * Input amount to lock
     * @type {number}
     * @memberof NewContractRequest
     */
    inputAmount: number;
    /**
     * Output amount to lock
     * @type {number}
     * @memberof NewContractRequest
     */
    outputAmount: number;
    /**
     * Timestamp to expire the contract
     * @type {number}
     * @memberof NewContractRequest
     */
    expiration: number;
    /**
     * Hashlock needed to refund the amount
     * @type {string}
     * @memberof NewContractRequest
     */
    hashLock: string;
    /**
     * The token address
     * @type {string}
     * @memberof NewContractRequest
     */
    tokenAddress: string;
    /**
     * The receiver address
     * @type {string}
     * @memberof NewContractRequest
     */
    receiver: string;
    /**
     * The output network id
     * @type {string}
     * @memberof NewContractRequest
     */
    outputNetwork: string;
    /**
     * The output address to receive the tokens
     * @type {string}
     * @memberof NewContractRequest
     */
    outputAddress: string;
    /**
     * 
     * @type {Web3SigningCredential}
     * @memberof NewContractRequest
     */
    web3SigningCredential: Web3SigningCredential;
    /**
     * connectorId for the connector besu plugin
     * @type {string}
     * @memberof NewContractRequest
     */
    connectorId: string;
    /**
     * keychainId for the keychian plugin
     * @type {string}
     * @memberof NewContractRequest
     */
    keychainId: string;
    /**
     * 
     * @type {string | number}
     * @memberof NewContractRequest
     */
    gas?: string | number;
}
/**
 * 
 * @export
 * @interface RefundRequest
 */
export interface RefundRequest {
    /**
     * Contract htlc id for refund
     * @type {string}
     * @memberof RefundRequest
     */
    id: string;
    /**
     * 
     * @type {Web3SigningCredential}
     * @memberof RefundRequest
     */
    web3SigningCredential: Web3SigningCredential;
    /**
     * connectorId for the connector besu plugin
     * @type {string}
     * @memberof RefundRequest
     */
    connectorId: string;
    /**
     * keychainId for the keychain plugin
     * @type {string}
     * @memberof RefundRequest
     */
    keychainId: string;
    /**
     * 
     * @type {string | number}
     * @memberof RefundRequest
     */
    gas?: string | number;
}
/**
 * 
 * @export
 * @interface RunTransactionResponse
 */
export interface RunTransactionResponse {
    /**
     * 
     * @type {Web3TransactionReceipt}
     * @memberof RunTransactionResponse
     */
    transactionReceipt: Web3TransactionReceipt;
}
/**
 * @type Web3SigningCredential
 * @export
 */
export type Web3SigningCredential = Web3SigningCredentialCactusKeychainRef | Web3SigningCredentialNone | Web3SigningCredentialPrivateKeyHex;

/**
 * 
 * @export
 * @interface Web3SigningCredentialCactusKeychainRef
 */
export interface Web3SigningCredentialCactusKeychainRef {
    /**
     * 
     * @type {Web3SigningCredentialType}
     * @memberof Web3SigningCredentialCactusKeychainRef
     */
    type: Web3SigningCredentialType;
    /**
     * The ethereum account (public key) that the credential  belongs to. Basically the username in the traditional  terminology of authentication.
     * @type {string}
     * @memberof Web3SigningCredentialCactusKeychainRef
     */
    ethAccount: string;
    /**
     * The key to use when looking up the the keychain entry holding the secret pointed to by the  keychainEntryKey parameter.
     * @type {string}
     * @memberof Web3SigningCredentialCactusKeychainRef
     */
    keychainEntryKey: string;
    /**
     * The keychain ID to use when looking up the the keychain plugin instance that will be used to retrieve the secret pointed to by the keychainEntryKey parameter.
     * @type {string}
     * @memberof Web3SigningCredentialCactusKeychainRef
     */
    keychainId: string;
}
/**
 * Using this denotes that there is no signing required because the transaction is pre-signed.
 * @export
 * @interface Web3SigningCredentialNone
 */
export interface Web3SigningCredentialNone {
    /**
     * 
     * @type {Web3SigningCredentialType}
     * @memberof Web3SigningCredentialNone
     */
    type: Web3SigningCredentialType;
}
/**
 * 
 * @export
 * @interface Web3SigningCredentialPrivateKeyHex
 */
export interface Web3SigningCredentialPrivateKeyHex {
    /**
     * 
     * @type {Web3SigningCredentialType}
     * @memberof Web3SigningCredentialPrivateKeyHex
     */
    type: Web3SigningCredentialType;
    /**
     * The ethereum account (public key) that the credential belongs to. Basically the username in the traditional terminology of authentication.
     * @type {string}
     * @memberof Web3SigningCredentialPrivateKeyHex
     */
    ethAccount: string;
    /**
     * The HEX encoded private key of an eth account.
     * @type {string}
     * @memberof Web3SigningCredentialPrivateKeyHex
     */
    secret: string;
}
/**
 * 
 * @export
 * @enum {string}
 */

export enum Web3SigningCredentialType {
    CactusKeychainRef = 'CACTUS_KEYCHAIN_REF',
    GethKeychainPassword = 'GETH_KEYCHAIN_PASSWORD',
    PrivateKeyHex = 'PRIVATE_KEY_HEX',
    None = 'NONE'
}

/**
 * 
 * @export
 * @interface Web3TransactionReceipt
 */
export interface Web3TransactionReceipt {
    [key: string]: object | any;

    /**
     * 
     * @type {boolean}
     * @memberof Web3TransactionReceipt
     */
    status: boolean;
    /**
     * 
     * @type {string}
     * @memberof Web3TransactionReceipt
     */
    transactionHash: string;
    /**
     * 
     * @type {number}
     * @memberof Web3TransactionReceipt
     */
    transactionIndex: number;
    /**
     * 
     * @type {string}
     * @memberof Web3TransactionReceipt
     */
    blockHash: string;
    /**
     * 
     * @type {number}
     * @memberof Web3TransactionReceipt
     */
    blockNumber: number;
    /**
     * 
     * @type {number}
     * @memberof Web3TransactionReceipt
     */
    gasUsed: number;
    /**
     * 
     * @type {string}
     * @memberof Web3TransactionReceipt
     */
    contractAddress?: string | null;
    /**
     * 
     * @type {string}
     * @memberof Web3TransactionReceipt
     */
    from: string;
    /**
     * 
     * @type {string}
     * @memberof Web3TransactionReceipt
     */
    to: string;
}
/**
 * 
 * @export
 * @interface WithdrawRequest
 */
export interface WithdrawRequest {
    /**
     * Contract locked id
     * @type {string}
     * @memberof WithdrawRequest
     */
    id: string;
    /**
     * Secret need to unlock the contract
     * @type {string}
     * @memberof WithdrawRequest
     */
    secret: string;
    /**
     * 
     * @type {Web3SigningCredential}
     * @memberof WithdrawRequest
     */
    web3SigningCredential: Web3SigningCredential;
    /**
     * connectorId for the connector besu plugin
     * @type {string}
     * @memberof WithdrawRequest
     */
    connectorId: string;
    /**
     * keychainId for the keychain plugin
     * @type {string}
     * @memberof WithdrawRequest
     */
    keychainId: string;
    /**
     * 
     * @type {string | number}
     * @memberof WithdrawRequest
     */
    gas?: string | number;
}

/**
 * DefaultApi - axios parameter creator
 * @export
 */
export const DefaultApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * 
         * @summary Get a status of a hashtimelock contract, the status are ( 0 - Invalid, 1 - Active, 2 - Refunded, 3 - Withdrawn, 4 - Expired)
         * @param {string} id 
         * @param {Web3SigningCredential} web3SigningCredential 
         * @param {string} connectorId 
         * @param {string} keychainId 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getSingleStatusV1: async (id: string, web3SigningCredential: Web3SigningCredential, connectorId: string, keychainId: string, options: any = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getSingleStatusV1', 'id', id)
            // verify required parameter 'web3SigningCredential' is not null or undefined
            assertParamExists('getSingleStatusV1', 'web3SigningCredential', web3SigningCredential)
            // verify required parameter 'connectorId' is not null or undefined
            assertParamExists('getSingleStatusV1', 'connectorId', connectorId)
            // verify required parameter 'keychainId' is not null or undefined
            assertParamExists('getSingleStatusV1', 'keychainId', keychainId)
            const localVarPath = `/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu-erc20/get-single-status`;
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'GET', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            if (id !== undefined) {
                localVarQueryParameter['id'] = id;
            }

            if (web3SigningCredential !== undefined) {
                localVarQueryParameter['web3SigningCredential'] = web3SigningCredential;
            }

            if (connectorId !== undefined) {
                localVarQueryParameter['connectorId'] = connectorId;
            }

            if (keychainId !== undefined) {
                localVarQueryParameter['keychainId'] = keychainId;
            }


    
            setSearchParams(localVarUrlObj, localVarQueryParameter, options.query);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * 
         * @summary Get array of status of a hashtimelock contract, the status are ( 0 - Invalid, 1 - Active, 2 - Refunded, 3 - Withdrawn, 4 - Expired)
         * @param {Array<string>} ids 
         * @param {Web3SigningCredential} web3SigningCredential 
         * @param {string} connectorId 
         * @param {string} keychainId 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getStatusV1: async (ids: Array<string>, web3SigningCredential: Web3SigningCredential, connectorId: string, keychainId: string, options: any = {}): Promise<RequestArgs> => {
            // verify required parameter 'ids' is not null or undefined
            assertParamExists('getStatusV1', 'ids', ids)
            // verify required parameter 'web3SigningCredential' is not null or undefined
            assertParamExists('getStatusV1', 'web3SigningCredential', web3SigningCredential)
            // verify required parameter 'connectorId' is not null or undefined
            assertParamExists('getStatusV1', 'connectorId', connectorId)
            // verify required parameter 'keychainId' is not null or undefined
            assertParamExists('getStatusV1', 'keychainId', keychainId)
            const localVarPath = `/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu-erc20/get-status`;
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'GET', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            if (ids) {
                localVarQueryParameter['ids'] = ids;
            }

            if (web3SigningCredential !== undefined) {
                localVarQueryParameter['web3SigningCredential'] = web3SigningCredential;
            }

            if (connectorId !== undefined) {
                localVarQueryParameter['connectorId'] = connectorId;
            }

            if (keychainId !== undefined) {
                localVarQueryParameter['keychainId'] = keychainId;
            }


    
            setSearchParams(localVarUrlObj, localVarQueryParameter, options.query);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * 
         * @summary Initialize contract
         * @param {InitializeRequest} [initializeRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        initializeV1: async (initializeRequest?: InitializeRequest, options: any = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu-erc20/initialize`;
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'POST', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;


    
            localVarHeaderParameter['Content-Type'] = 'application/json';

            setSearchParams(localVarUrlObj, localVarQueryParameter, options.query);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};
            localVarRequestOptions.data = serializeDataIfNeeded(initializeRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * 
         * @summary Create a new hashtimelock contract
         * @param {NewContractRequest} [newContractRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        newContractV1: async (newContractRequest?: NewContractRequest, options: any = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu-erc20/new-contract`;
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'POST', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;


    
            localVarHeaderParameter['Content-Type'] = 'application/json';

            setSearchParams(localVarUrlObj, localVarQueryParameter, options.query);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};
            localVarRequestOptions.data = serializeDataIfNeeded(newContractRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * 
         * @summary Refund a hashtimelock contract
         * @param {RefundRequest} [refundRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        refundV1: async (refundRequest?: RefundRequest, options: any = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu-erc20/refund`;
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'POST', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;


    
            localVarHeaderParameter['Content-Type'] = 'application/json';

            setSearchParams(localVarUrlObj, localVarQueryParameter, options.query);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};
            localVarRequestOptions.data = serializeDataIfNeeded(refundRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * 
         * @summary Withdraw a hashtimelock contract
         * @param {WithdrawRequest} [withdrawRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        withdrawV1: async (withdrawRequest?: WithdrawRequest, options: any = {}): Promise<RequestArgs> => {
            const localVarPath = `/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu-erc20/withdraw`;
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'POST', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;


    
            localVarHeaderParameter['Content-Type'] = 'application/json';

            setSearchParams(localVarUrlObj, localVarQueryParameter, options.query);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};
            localVarRequestOptions.data = serializeDataIfNeeded(withdrawRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * DefaultApi - functional programming interface
 * @export
 */
export const DefaultApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = DefaultApiAxiosParamCreator(configuration)
    return {
        /**
         * 
         * @summary Get a status of a hashtimelock contract, the status are ( 0 - Invalid, 1 - Active, 2 - Refunded, 3 - Withdrawn, 4 - Expired)
         * @param {string} id 
         * @param {Web3SigningCredential} web3SigningCredential 
         * @param {string} connectorId 
         * @param {string} keychainId 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getSingleStatusV1(id: string, web3SigningCredential: Web3SigningCredential, connectorId: string, keychainId: string, options?: any): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<number>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getSingleStatusV1(id, web3SigningCredential, connectorId, keychainId, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * 
         * @summary Get array of status of a hashtimelock contract, the status are ( 0 - Invalid, 1 - Active, 2 - Refunded, 3 - Withdrawn, 4 - Expired)
         * @param {Array<string>} ids 
         * @param {Web3SigningCredential} web3SigningCredential 
         * @param {string} connectorId 
         * @param {string} keychainId 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getStatusV1(ids: Array<string>, web3SigningCredential: Web3SigningCredential, connectorId: string, keychainId: string, options?: any): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Array<number>>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getStatusV1(ids, web3SigningCredential, connectorId, keychainId, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * 
         * @summary Initialize contract
         * @param {InitializeRequest} [initializeRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async initializeV1(initializeRequest?: InitializeRequest, options?: any): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<RunTransactionResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.initializeV1(initializeRequest, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * 
         * @summary Create a new hashtimelock contract
         * @param {NewContractRequest} [newContractRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async newContractV1(newContractRequest?: NewContractRequest, options?: any): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<InvokeContractV1Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.newContractV1(newContractRequest, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * 
         * @summary Refund a hashtimelock contract
         * @param {RefundRequest} [refundRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async refundV1(refundRequest?: RefundRequest, options?: any): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<InvokeContractV1Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.refundV1(refundRequest, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * 
         * @summary Withdraw a hashtimelock contract
         * @param {WithdrawRequest} [withdrawRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async withdrawV1(withdrawRequest?: WithdrawRequest, options?: any): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<InvokeContractV1Response>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.withdrawV1(withdrawRequest, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
    }
};

/**
 * DefaultApi - factory interface
 * @export
 */
export const DefaultApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = DefaultApiFp(configuration)
    return {
        /**
         * 
         * @summary Get a status of a hashtimelock contract, the status are ( 0 - Invalid, 1 - Active, 2 - Refunded, 3 - Withdrawn, 4 - Expired)
         * @param {string} id 
         * @param {Web3SigningCredential} web3SigningCredential 
         * @param {string} connectorId 
         * @param {string} keychainId 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getSingleStatusV1(id: string, web3SigningCredential: Web3SigningCredential, connectorId: string, keychainId: string, options?: any): AxiosPromise<number> {
            return localVarFp.getSingleStatusV1(id, web3SigningCredential, connectorId, keychainId, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Get array of status of a hashtimelock contract, the status are ( 0 - Invalid, 1 - Active, 2 - Refunded, 3 - Withdrawn, 4 - Expired)
         * @param {Array<string>} ids 
         * @param {Web3SigningCredential} web3SigningCredential 
         * @param {string} connectorId 
         * @param {string} keychainId 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getStatusV1(ids: Array<string>, web3SigningCredential: Web3SigningCredential, connectorId: string, keychainId: string, options?: any): AxiosPromise<Array<number>> {
            return localVarFp.getStatusV1(ids, web3SigningCredential, connectorId, keychainId, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Initialize contract
         * @param {InitializeRequest} [initializeRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        initializeV1(initializeRequest?: InitializeRequest, options?: any): AxiosPromise<RunTransactionResponse> {
            return localVarFp.initializeV1(initializeRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Create a new hashtimelock contract
         * @param {NewContractRequest} [newContractRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        newContractV1(newContractRequest?: NewContractRequest, options?: any): AxiosPromise<InvokeContractV1Response> {
            return localVarFp.newContractV1(newContractRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Refund a hashtimelock contract
         * @param {RefundRequest} [refundRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        refundV1(refundRequest?: RefundRequest, options?: any): AxiosPromise<InvokeContractV1Response> {
            return localVarFp.refundV1(refundRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Withdraw a hashtimelock contract
         * @param {WithdrawRequest} [withdrawRequest] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        withdrawV1(withdrawRequest?: WithdrawRequest, options?: any): AxiosPromise<InvokeContractV1Response> {
            return localVarFp.withdrawV1(withdrawRequest, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * DefaultApi - object-oriented interface
 * @export
 * @class DefaultApi
 * @extends {BaseAPI}
 */
export class DefaultApi extends BaseAPI {
    /**
     * 
     * @summary Get a status of a hashtimelock contract, the status are ( 0 - Invalid, 1 - Active, 2 - Refunded, 3 - Withdrawn, 4 - Expired)
     * @param {string} id 
     * @param {Web3SigningCredential} web3SigningCredential 
     * @param {string} connectorId 
     * @param {string} keychainId 
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof DefaultApi
     */
    public getSingleStatusV1(id: string, web3SigningCredential: Web3SigningCredential, connectorId: string, keychainId: string, options?: any) {
        return DefaultApiFp(this.configuration).getSingleStatusV1(id, web3SigningCredential, connectorId, keychainId, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Get array of status of a hashtimelock contract, the status are ( 0 - Invalid, 1 - Active, 2 - Refunded, 3 - Withdrawn, 4 - Expired)
     * @param {Array<string>} ids 
     * @param {Web3SigningCredential} web3SigningCredential 
     * @param {string} connectorId 
     * @param {string} keychainId 
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof DefaultApi
     */
    public getStatusV1(ids: Array<string>, web3SigningCredential: Web3SigningCredential, connectorId: string, keychainId: string, options?: any) {
        return DefaultApiFp(this.configuration).getStatusV1(ids, web3SigningCredential, connectorId, keychainId, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Initialize contract
     * @param {InitializeRequest} [initializeRequest] 
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof DefaultApi
     */
    public initializeV1(initializeRequest?: InitializeRequest, options?: any) {
        return DefaultApiFp(this.configuration).initializeV1(initializeRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Create a new hashtimelock contract
     * @param {NewContractRequest} [newContractRequest] 
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof DefaultApi
     */
    public newContractV1(newContractRequest?: NewContractRequest, options?: any) {
        return DefaultApiFp(this.configuration).newContractV1(newContractRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Refund a hashtimelock contract
     * @param {RefundRequest} [refundRequest] 
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof DefaultApi
     */
    public refundV1(refundRequest?: RefundRequest, options?: any) {
        return DefaultApiFp(this.configuration).refundV1(refundRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Withdraw a hashtimelock contract
     * @param {WithdrawRequest} [withdrawRequest] 
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof DefaultApi
     */
    public withdrawV1(withdrawRequest?: WithdrawRequest, options?: any) {
        return DefaultApiFp(this.configuration).withdrawV1(withdrawRequest, options).then((request) => request(this.axios, this.basePath));
    }
}


