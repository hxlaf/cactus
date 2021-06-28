import { Server } from "http";
import { Server as SecureServer } from "https";
import { txHelper } from "iroha-helpers";
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
//import { WatchBlocksV1Endpoint } from "./web-services/watch-blocks-v1-endpoint";

export const E_KEYCHAIN_NOT_FOUND = "cactus.connector.iroha.keychain_not_found";

export interface IPluginLedgerConnectorIrohaOptions
  extends ICactusPluginOptions {
  rpcTorriPort: string;
  pluginRegistry: PluginRegistry;
  prometheusExporter?: PrometheusExporter;
  logLevel?: LogLevelDesc;
}

export class PluginLedgerConnectorIroha
  implements
    IPluginLedgerConnector<RunTransactionRequest, RunTransactionResponse>,
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
    this.prometheusExporter =
      options.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );

    this.prometheusExporter.startMetricsCollection();
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
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    //const fnTag = `${this.className}#transact()`;
    //commandName:string
    //params:Array<any>
    return txHelper(req);
    //txhelper instance of object in the iroha connector
  }
}
