import { Server } from "http";
import * as grpc from "grpc";
import { Server as SecureServer } from "https";
import { CommandService_v1Client as CommandService } from "iroha-helpers-ts/lib/proto/endpoint_grpc_pb";
import { QueryService_v1Client as QueryService } from "iroha-helpers-ts/lib/proto/endpoint_grpc_pb";
import commands from "iroha-helpers-ts/lib/commands/index";
import queries from "iroha-helpers-ts/lib/queries";
//import type { Server as SocketIoServer } from "socket.io";
//import type { Socket as SocketIoSocket } from "socket.io";
import type { Express } from "express";
import { promisify } from "util";
import { Optional } from "typescript-optional";
//import { AbiItem } from "web3-utils";
//import { Contract, ContractSendMethod } from "web3-eth-contract";
//import { TransactionReceipt } from "web3-eth";

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
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import {
  // InvokeContractV1Request,
  // InvokeContractV1Response,
  RunTransactionRequest,
  RunTransactionResponse,
} from "./generated/openapi/typescript-axios/";

import { RunTransactionEndpoint } from "./web-services/run-transaction-endpoint";
//import { isWeb3SigningCredentialNone } from "./model-type-guards";
import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import {
  GetPrometheusExporterMetricsEndpointV1,
  IGetPrometheusExporterMetricsEndpointV1Options,
} from "./web-services/get-prometheus-exporter-metrics-endpoint-v1";
//import { stringify } from "querystring";
//import { transcode } from "buffer";
//import { WatchBlocksV1Endpoint } from "./web-services/watch-blocks-v1-endpoint";

export const E_KEYCHAIN_NOT_FOUND = "cactus.connector.iroha.keychain_not_found";

export interface IPluginLedgerConnectorIrohaOptions
  extends ICactusPluginOptions {
  rpcToriiPortHost: string;
  pluginRegistry: PluginRegistry;
  prometheusExporter?: PrometheusExporter;
  logLevel?: LogLevelDesc;
}

export class PluginLedgerConnectorIroha
  implements
    IPluginLedgerConnector<
      never,
      never,
      RunTransactionRequest,
      RunTransactionResponse
    >,
    ICactusPlugin,
    IPluginWebService {
  private readonly instanceId: string;
  public prometheusExporter: PrometheusExporter;
  private readonly log: Logger;
  private readonly pluginRegistry: PluginRegistry;

  private endpoints: IWebServiceEndpoint[] | undefined;
  private httpServer: Server | SecureServer | null = null;

  public static readonly CLASS_NAME = "PluginLedgerConnectorIroha";

  public get className(): string {
    return PluginLedgerConnectorIroha.CLASS_NAME;
  }

  constructor(public readonly options: IPluginLedgerConnectorIrohaOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(
      options.rpcToriiPortHost,
      `${fnTag} options.rpcTorriPortHost`,
    );
    Checks.truthy(options.pluginRegistry, `${fnTag} options.pluginRegistry`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = options.instanceId;
    this.pluginRegistry = options.pluginRegistry;
    this.prometheusExporter =
      options.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );

    this.prometheusExporter.startMetricsCollection();
  }
  deployContract(): Promise<never> {
    throw new Error("Method not implemented.");
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
  }

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
    //wsApi: SocketIoServer,
  ): Promise<IWebServiceEndpoint[]> {
    //const { web3 } = this;
    //const { logLevel } = this.options;
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));

    // wsApi.on("connection", (socket: SocketIoSocket) => {
    //   this.log.debug(`New Socket connected. ID=${socket.id}`);

    //   socket.on(WatchBlocksV1.Subscribe, () => {
    //     new WatchBlocksV1Endpoint({ web3, socket, logLevel }).subscribe();
    //   });
    // });
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }
    const endpoints: IWebServiceEndpoint[] = [];
    {
      const endpoint = new RunTransactionEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    // {
    //   const endpoint = new InvokeContractEndpoint({
    //     connector: this,
    //     logLevel: this.options.logLevel,
    //   });
    //   endpoints.push(endpoint);
    // }

    {
      const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
        connector: this,
        logLevel: this.options.logLevel,
      };
      const endpoint = new GetPrometheusExporterMetricsEndpointV1(opts);
      endpoints.push(endpoint);
    }
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
    req: RunTransactionRequest, //string + array<any>
  ): Promise<RunTransactionResponse> {
    const adminPriv =
      "f101537e319568c765b2cc89698325604991dca57b9716b58016b253506cab70";
    const commandService = new CommandService(
      "localhost:50051",
      grpc.credentials.createInsecure(),
    );
    const queryService = new QueryService(
      "localhost:50051",
      grpc.credentials.createInsecure(),
    );
    const commandOptions = {
      privateKeys: [adminPriv],
      creatorAccountId: "admin@test",
      quorum: 1,
      commandService: commandService,
      timeoutLimit: 5000,
    };
    const queryOptions = {
      privateKey: adminPriv,
      creatorAccountId: "admin@test",
      queryService: queryService,
      timeoutLimit: 5000,
    };
    console.log(req);
    if (req.commandName === "createAccount") {
      try {
        const response = await commands //create user
          .createAccount(commandOptions, {
            accountName: req.params[0],
            domainId: req.params[1],
            publicKey: req.params[2],
          });
        return { transactionReceipt: response };
      } catch (err) {
        throw new Error(err);
      }
    } else if (req.commandName === "createAsset") {
      try {
        const response = await commands // (coolcoin#test; precision:3)
          .createAsset(commandOptions, {
            assetName: req.params[0],
            domainId: req.params[1],
            precision: req.params[2],
          });
        return { transactionReceipt: response };
      } catch (err) {
        throw new Error(err);
      }
    } else if (req.commandName === "createDomain") {
      try {
        const response = await commands.createDomain(commandOptions, {
          domainId: req.params[0],
          defaultRole: req.params[1],
        });
        return { transactionReceipt: response };
      } catch (err) {
        throw new Error(err);
      }
    } else if (req.commandName === "addAssetQuantity") {
      try {
        const response = await commands.addAssetQuantity(commandOptions, {
          assetId: req.params[0],
          amount: req.params[1],
        });
        return { transactionReceipt: response };
      } catch (err) {
        throw new Error(err);
      }
    } else if (req.commandName === "transferAsset") {
      try {
        const response = await commands.transferAsset(commandOptions, {
          srcAccountId: req.params[0],
          destAccountId: req.params[1],
          assetId: req.params[2],
          description: req.params[3],
          amount: req.params[4],
        });
        return { transactionReceipt: response };
      } catch (err) {
        throw new Error(err);
      }
    } else if (req.commandName === "getSignatories") {
      try {
        const queryRes = await queries.getSignatories(queryOptions, {
          accountId: req.params[0],
        });
        return { transactionReceipt: queryRes };
      } catch (err) {
        throw new Error(err);
      }
    } else if (req.commandName === "getAccount") {
      try {
        const queryRes = await queries.getAccount(queryOptions, {
          accountId: req.params[0],
        });
        return { transactionReceipt: queryRes };
      } catch (err) {
        throw new Error(err);
      }
    } else if (req.commandName === "getRawAccount") {
      try {
        const queryRes = await queries.getRawAccount(queryOptions, {
          accountId: req.params[0],
        });
        return { transactionReceipt: queryRes };
      } catch (err) {
        throw new Error(err);
      }
    } else if (req.commandName === "getAssetInfo") {
      try {
        const queryRes = await queries.getAssetInfo(queryOptions, {
          assetId: req.params[0],
        });
        return { transactionReceipt: queryRes };
      } catch (err) {
        throw new Error(err);
      }
    }
    //txhelper instance of object in the iroha connector
    return { transactionReceipt: "command does not exist" };
  }
}
