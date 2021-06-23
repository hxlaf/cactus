import { Server } from "http";
import { Server as SecureServer } from "https";

import type { Server as SocketIoServer } from "socket.io";
import type { Socket as SocketIoSocket } from "socket.io";
import type { Express } from "express";
import { promisify } from "util";
import { Optional } from "typescript-optional";
import Web3 from "web3";
import { AbiItem } from "web3-utils";

import { Contract, ContractSendMethod } from "web3-eth-contract";
import { TransactionReceipt } from "web3-eth";

import {
  ConsensusAlgorithmFamily,
  IPluginLedgerConnector,
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import {
  PluginRegistry,
  consensusHasTransactionFinality,
} from "@hyperledger/cactus-core";

import {
  Checks,
  CodedError,
  IJsObjectSignerOptions,
  JsObjectSigner,
  KeyConverter,
  KeyFormat,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import {
  WatchBlocksV1,
  ConsistencyStrategy,
  DeployContractSolidityBytecodeV1Request,
  DeployContractSolidityBytecodeV1Response,
  EthContractInvocationType,
  InvokeContractV1Request,
  InvokeContractV1Response,
  ReceiptType,
  RunTransactionRequest,
  RunTransactionResponse,
  SignTransactionRequest,
  SignTransactionResponse,
  Web3SigningCredentialCactusKeychainRef,
  Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
} from "./generated/openapi/typescript-axios/";

import { RunTransactionEndpoint } from "./web-services/run-transaction-endpoint";
import { isWeb3SigningCredentialNone } from "./model-type-guards";
// import { BesuSignTransactionEndpointV1 } from "./web-services/sign-transaction-endpoint-v1";
// import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
// import {
//   GetPrometheusExporterMetricsEndpointV1,
//   IGetPrometheusExporterMetricsEndpointV1Options,
// } from "./web-services/get-prometheus-exporter-metrics-endpoint-v1";
import { WatchBlocksV1Endpoint } from "./web-services/watch-blocks-v1-endpoint";

export const E_KEYCHAIN_NOT_FOUND = "cactus.connector.besu.keychain_not_found";

export interface IPluginLedgerConnectorIrohaOptions
  extends ICactusPluginOptions {
  rpcTorriPort: string;
  pluginRegistry: PluginRegistry;
  //prometheusExporter?: PrometheusExporter;
  logLevel?: LogLevelDesc;
}

export class PluginLedgerConnectorIroha
  implements
    IPluginLedgerConnector<
      RunTransactionRequest,
      RunTransactionResponse
    >,
    ICactusPlugin,
    IPluginWebService {
  private readonly instanceId: string;
  //public prometheusExporter: PrometheusExporter;
  private readonly log: Logger;
  private readonly web3: Web3;
  private readonly pluginRegistry: PluginRegistry;
  private contracts: {
    [name: string]: Contract;
  } = {};

  private endpoints: IWebServiceEndpoint[] | undefined;
  private httpServer: Server | SecureServer | null = null;

  public static readonly CLASS_NAME = "PluginLedgerConnectorIroha";

  public get className(): string {
    return PluginLedgerConnectorIroha.CLASS_NAME;
  }

  constructor(public readonly options: IPluginLedgerConnectorIrohaOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.rpcTorriPort, `${fnTag} options.rpcTorriPort`);
    Checks.truthy(options.pluginRegistry, `${fnTag} options.pluginRegistry`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    // const web3WsProvider = new Web3.providers.WebsocketProvider(
    //   this.options.rpcApiWsHost,
    // );
    //this.web3 = new Web3(web3WsProvider);
    this.instanceId = options.instanceId;
    this.pluginRegistry = options.pluginRegistry;
    // this.prometheusExporter =
    //   options.prometheusExporter ||
    //   new PrometheusExporter({ pollingIntervalInMin: 1 });
    // Checks.truthy(
    //   this.prometheusExporter,
    //   `${fnTag} options.prometheusExporter`,
    // );

    //this.prometheusExporter.startMetricsCollection();
  }

  // public getPrometheusExporter(): PrometheusExporter {
  //   return this.prometheusExporter;
  // }

  // public async getPrometheusExporterMetrics(): Promise<string> {
  //   const res: string = await this.prometheusExporter.getPrometheusMetrics();
  //   this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
  //   return res;
  // }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.ofNullable(this.httpServer);
  }

  public async shutdown(): Promise<void> {
    const serverMaybe = this.getHttpServer();
    if (serverMaybe.isPresent()) {
      const server = serverMaybe.get();
      await promisify(server.close.bind(server))();
    }
  }

  async registerWebServices(
    app: Express,
    wsApi: SocketIoServer,
  ): Promise<IWebServiceEndpoint[]> {
    const { web3 } = this;
    const { logLevel } = this.options;
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));

    wsApi.on("connection", (socket: SocketIoSocket) => {
      this.log.debug(`New Socket connected. ID=${socket.id}`);

      socket.on(WatchBlocksV1.Subscribe, () => {
        new WatchBlocksV1Endpoint({ web3, socket, logLevel }).subscribe();
      });
    });
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    const endpoints: IWebServiceEndpoint[] = [];
    // {
    //   const endpoint = new DeployContractSolidityBytecodeEndpoint({
    //     connector: this,
    //     logLevel: this.options.logLevel,
    //   });
    //   endpoints.push(endpoint);
    // }
    {
      const endpoint = new RunTransactionEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
    //   const endpoint = new InvokeContractEndpoint({
    //     connector: this,
    //     logLevel: this.options.logLevel,
    //   });
    //   endpoints.push(endpoint);
    // }
    // {
    //   const endpoint = new BesuSignTransactionEndpointV1({
    //     connector: this,
    //     logLevel: this.options.logLevel,
    //   });
    //   endpoints.push(endpoint);
    // }
    // {
    //   const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
    //     connector: this,
    //     logLevel: this.options.logLevel,
    //   };
    //   const endpoint = new GetPrometheusExporterMetricsEndpointV1(opts);
    //   endpoints.push(endpoint);
    // }
    this.endpoints = endpoints;
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-iroha`;
  }

  public async getConsensusAlgorithmFamily(): Promise<
    ConsensusAlgorithmFamily
  > {
    return ConsensusAlgorithmFamily.Authority;
  }
  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily = await this.getConsensusAlgorithmFamily();

    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
  }
//...  spread
//pass in the params 
  public async transact(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transact()`;
    //commandName:string
    //params:Array<any>  
    switch (req.web3SigningCredential.type) {
      // Web3SigningCredentialType.GETHKEYCHAINPASSWORD is removed as Hyperledger Besu doesn't support the PERSONAL api
      // for --rpc-http-api as per the discussion mentioned here
      // https://chat.hyperledger.org/channel/besu-contributors?msg=GqQXfW3k79ygRtx5Q
      case Web3SigningCredentialType.CactusKeychainRef: {
        return this.transactCactusKeychainRef(req);
      }
      case Web3SigningCredentialType.PrivateKeyHex: {
        return this.transactPrivateKey(req);
      }
      case Web3SigningCredentialType.None: {
        if (req.transactionConfig.rawTransaction) {
          return this.transactSigned(req);
        } else {
          throw new Error(
            `${fnTag} Expected pre-signed raw transaction ` +
              ` since signing credential is specified as` +
              `Web3SigningCredentialType.NONE`,
          );
        }
      }
      default: {
        throw new Error(
          `${fnTag} Unrecognized Web3SigningCredentialType: ` +
            `${req.web3SigningCredential.type} Supported ones are: ` +
            `${Object.values(Web3SigningCredentialType).join(";")}`,
        );
      }
    }
  }

  public async transactSigned(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transactSigned()`;

    Checks.truthy(req.consistencyStrategy, `${fnTag}:req.consistencyStrategy`);
    Checks.truthy(
      req.transactionConfig.rawTransaction,
      `${fnTag}:req.transactionConfig.rawTransaction`,
    );
    const rawTx = req.transactionConfig.rawTransaction as string;
    this.log.debug("Starting web3.eth.sendSignedTransaction(rawTransaction) ");
    const txPoolReceipt = await this.web3.eth.sendSignedTransaction(rawTx);
    this.log.debug("Received preliminary receipt from Besu node.");

    if (txPoolReceipt instanceof Error) {
      this.log.debug(`${fnTag} sendSignedTransaction failed`, txPoolReceipt);
      throw txPoolReceipt;
    }
    this.prometheusExporter.addCurrentTransaction();

    if (
      req.consistencyStrategy.receiptType === ReceiptType.NodeTxPoolAck &&
      req.consistencyStrategy.blockConfirmations > 0
    ) {
      throw new Error(
        `${fnTag} Conflicting parameters for consistency` +
          ` strategy: Cannot wait for >0 block confirmations AND only wait ` +
          ` for the tx pool ACK at the same time.`,
      );
    }

    switch (req.consistencyStrategy.receiptType) {
      case ReceiptType.NodeTxPoolAck:
        return { transactionReceipt: txPoolReceipt };
      case ReceiptType.LedgerBlockAck:
        this.log.debug("Starting poll for ledger TX receipt ...");
        const txHash = txPoolReceipt.transactionHash;
        const { consistencyStrategy } = req;
        const ledgerReceipt = await this.pollForTxReceipt(
          txHash,
          consistencyStrategy,
        );
        this.log.debug(
          "Finished poll for ledger TX receipt: %o",
          ledgerReceipt,
        );
        return { transactionReceipt: ledgerReceipt };
      default:
        throw new Error(
          `${fnTag} Unrecognized ReceiptType: ${req.consistencyStrategy.receiptType}`,
        );
    }
  }

  public async transactPrivateKey(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transactPrivateKey()`;
    const { transactionConfig, web3SigningCredential } = req;
    const {
      secret,
    } = web3SigningCredential as Web3SigningCredentialPrivateKeyHex;

    const signedTx = await this.web3.eth.accounts.signTransaction(
      transactionConfig,
      secret,
    );

    if (signedTx.rawTransaction) {
      req.transactionConfig.rawTransaction = signedTx.rawTransaction;
      return this.transactSigned(req);
    } else {
      throw new Error(
        `${fnTag} Failed to sign eth transaction. ` +
          `signedTransaction.rawTransaction is blank after .signTransaction().`,
      );
    }
  }

  public async transactCactusKeychainRef(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transactCactusKeychainRef()`;
    const { transactionConfig, web3SigningCredential } = req;
    const {
      ethAccount,
      keychainEntryKey,
      keychainId,
    } = web3SigningCredential as Web3SigningCredentialCactusKeychainRef;

    // locate the keychain plugin that has access to the keychain backend
    // denoted by the keychainID from the request.
    const keychainPlugin = this.pluginRegistry.findOneByKeychainId(keychainId);

    Checks.truthy(keychainPlugin, `${fnTag} keychain for ID:"${keychainId}"`);

    // Now use the found keychain plugin to actually perform the lookup of
    // the private key that we need to run the transaction.
    const privateKeyHex = await keychainPlugin?.get<string>(keychainEntryKey);

    return this.transactPrivateKey({
      transactionConfig,
      web3SigningCredential: {
        ethAccount,
        type: Web3SigningCredentialType.PrivateKeyHex,
        secret: privateKeyHex,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
        timeoutMs: 60000,
      },
    });
  }

  public async pollForTxReceipt(
    txHash: string,
    consistencyStrategy: ConsistencyStrategy,
  ): Promise<TransactionReceipt> {
    const fnTag = `${this.className}#pollForTxReceipt()`;
    let txReceipt;
    let timedOut = false;
    let tries = 0;
    let confirmationCount = 0;
    const timeoutMs = consistencyStrategy.timeoutMs || Number.MAX_SAFE_INTEGER;
    const startedAt = new Date();

    do {
      tries++;
      timedOut = Date.now() >= startedAt.getTime() + timeoutMs;
      if (timedOut) {
        break;
      }

      txReceipt = await this.web3.eth.getTransactionReceipt(txHash);
      if (!txReceipt) {
        continue;
      }

      const latestBlockNo = await this.web3.eth.getBlockNumber();
      confirmationCount = latestBlockNo - txReceipt.blockNumber;
    } while (confirmationCount >= consistencyStrategy.blockConfirmations);

    if (!txReceipt) {
      throw new Error(`${fnTag} Timed out ${timeoutMs}ms, polls=${tries}`);
    }
    return txReceipt;
  }

  public async signTransaction(
    req: SignTransactionRequest,
  ): Promise<Optional<SignTransactionResponse>> {
    const { pluginRegistry, rpcApiHttpHost, logLevel } = this.options;
    const { keychainId, keychainRef, transactionHash } = req;

    const converter = new KeyConverter();

    const web3Provider = new Web3.providers.HttpProvider(rpcApiHttpHost);
    const web3 = new Web3(web3Provider);

    // Make sure the transaction exists on the ledger first...
    const transaction = await web3.eth.getTransaction(transactionHash);
    if (!transaction) {
      return Optional.empty();
    }

    const keychain = pluginRegistry.findOneByKeychainId(keychainId);

    if (!keychain) {
      const msg = `Keychain for ID ${keychainId} not found.`;
      throw new CodedError(msg, E_KEYCHAIN_NOT_FOUND);
    }

    const pem: string = await keychain.get(keychainRef);

    const pkRaw = converter.privateKeyAs(pem, KeyFormat.PEM, KeyFormat.Raw);

    const jsObjectSignerOptions: IJsObjectSignerOptions = {
      privateKey: pkRaw,
      logLevel,
    };

    const jsObjectSigner = new JsObjectSigner(jsObjectSignerOptions);

    if (transaction !== undefined && transaction !== null) {
      const singData = jsObjectSigner.sign(transaction.input);
      const signDataHex = Buffer.from(singData).toString("hex");

      const resBody: SignTransactionResponse = { signature: signDataHex };
      return Optional.ofNullable(resBody);
    }

    return Optional.empty();
  }
}
