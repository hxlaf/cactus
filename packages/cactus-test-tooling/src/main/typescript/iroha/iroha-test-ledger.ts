import Docker, { Container, ContainerInfo } from "dockerode";
import Joi from "joi";
import { v4 as internalIpV4 } from "internal-ip";
import { EventEmitter } from "events";
import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Bools,
  Checks,
} from "@hyperledger/cactus-common";
import { ITestLedger } from "../i-test-ledger";
import { IKeyPair } from "../i-key-pair";
import { Containers } from "../common/containers";

/*
 * Contains options for Iroha container
 */
export interface IIrohaTestLedgerOptions {
  readonly irohaHost: string;
  //readonly irohaPort: number;
  readonly postgresHost: string;
  readonly postgresPort: number;
  readonly imageVersion?: string;
  readonly imageName?: string;
  readonly rpcToriiPort?: number;
  readonly envVars?: string[];
  readonly logLevel?: LogLevelDesc;
  readonly emitContainerLogs?: boolean;
}

/*
 * Provides default options for Iroha container
 */
export const IROHA_TEST_LEDGER_DEFAULT_OPTIONS = Object.freeze({
  imageVersion: "2021-08-04--1183",
  imageName: "ghcr.io/hyperledger/cactus-iroha-all-in-one",
  rpcToriiPort: 50051,
  envVars: [
    "IROHA_POSTGRES_USER=postgres",
    "IROHA_POSTGRES_PASSWORD=my-secret-password",
    "KEY=node0",
  ],
});

//can we go inside the docker container and then test within the docker container
///initiated by the dockrode service
/*
 * Provides validations for Iroha container's options
 */
export const IROHA_TEST_LEDGER_OPTIONS_JOI_SCHEMA: Joi.Schema = Joi.object().keys(
  {
    irohaHost: Joi.string().hostname().required(),
    //irohaPort: Joi.number().port().required(),
    postgresHost: Joi.string().hostname().required(),
    postgresPort: Joi.number().port().required(),
    imageVersion: Joi.string().min(5).required(),
    imageName: Joi.string().min(1).required(),
    rpcToriiPort: Joi.number().min(1024).max(65535).required(),
    envVars: Joi.array().allow(null).required(),
  },
);

export class IrohaTestLedger implements ITestLedger {
  public readonly imageVersion: string;
  public readonly imageName: string;
  public readonly rpcToriiPort: number;
  public readonly envVars: string[];
  public readonly emitContainerLogs: boolean;
  public readonly irohaHost: string;
  //public readonly irohaPort: number;
  public readonly postgresHost: string;
  public readonly postgresPort: number;

  private readonly log: Logger;
  private container: Container | undefined;
  private containerId: string | undefined;

  constructor(public readonly options: IIrohaTestLedgerOptions) {
    const fnTag = `IrohaTestLedger#constructor()`;
    if (!options) {
      throw new TypeError(`IrohaTestLedger#ctor options was falsy.`);
    }
    Checks.nonBlankString(options.irohaHost, `${fnTag} irohaHost`);
    //Checks.truthy(options.irohaPort, `${fnTag} irohaPort`);
    Checks.nonBlankString(options.postgresHost, `${fnTag} postgresHost`);
    Checks.truthy(options.postgresPort, `${fnTag} postgresPort`);

    this.irohaHost = options.irohaHost;
    //this.irohaPort = options.irohaPort;
    this.postgresHost = options.postgresHost;
    this.postgresPort = options.postgresPort;

    this.imageVersion =
      options.imageVersion || IROHA_TEST_LEDGER_DEFAULT_OPTIONS.imageVersion;
    this.imageName =
      options.imageName || IROHA_TEST_LEDGER_DEFAULT_OPTIONS.imageName;
    this.rpcToriiPort =
      options.rpcToriiPort || IROHA_TEST_LEDGER_DEFAULT_OPTIONS.rpcToriiPort;
    this.envVars = options.envVars || [
      ...IROHA_TEST_LEDGER_DEFAULT_OPTIONS.envVars,
    ];

    this.envVars.push(`IROHA_POSTGRES_HOST=${this.postgresHost}`);
    this.envVars.push(`IROHA_POSTGRES_PORT=${this.postgresPort}`);

    this.emitContainerLogs = Bools.isBooleanStrict(options.emitContainerLogs)
      ? (options.emitContainerLogs as boolean)
      : true;

    this.validateConstructorOptions();
    const label = "iroha-test-ledger";
    const level = options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public getContainer(): Container {
    const fnTag = "IrohaTestLedger#getContainer()";
    if (!this.container) {
      throw new Error(`${fnTag} container not yet started by this instance.`);
    } else {
      return this.container;
    }
  }

  public get imageFqn(): string {
    return `${this.imageName}:${this.imageVersion}`;
  }

  public async getRpcToriiPortHost(): Promise<string> {
    const ipAddress = await internalIpV4();
    const hostPort: number = await this.getRpcToriiPort();
    return `http://${ipAddress}:${hostPort}`;
  }

  /**
   * Output is based on the standard Iroha genesis.block contents.
   *
   * @see https://github.com/hyperledger/iroha/blob/main/example/genesis.block
   */
  public getGenesisAdminAccount(): string {
    return "admin@test";
  }

  /**
   * Output is based on the standard Iroha admin user public key.
   *
   * @see https://github.com/hyperledger/iroha/blob/main/example/admin%40test.pub
   * @see https://github.com/hyperledger/iroha/blob/main/example/genesis.block
   */
  public getGenesisAccountPubKey(): string {
    return "313a07e6384776ed95447710d15e59148473ccfc052a681317a72a69f2a49910";
  }

  /**
   * Output is based on the standard Iroha admin user private key.
   *
   * @see https://github.com/hyperledger/iroha/blob/main/example/admin%40test.priv
   */
  public getGenesisAccountPrivKey(): string {
    return "f101537e319568c765b2cc89698325604991dca57b9716b58016b253506cab70";
  }

  public async getNodeKeyPair(): Promise<IKeyPair> {
    const fnTag = `IrohaTestLedger#getNodeKeyPair()`;
    if (!this.container) {
      throw new Error(`${fnTag} this.container cannot be falsy.`);
    }
    const publicKey = await Containers.pullFile(
      this.container,
      "/opt/iroha_data/node0.pub",
    );
    const privateKey = await Containers.pullFile(
      this.container,
      "/opt/iroha_data/node0.priv",
    );
    return { publicKey, privateKey };
  }

  public async start(omitPull = false): Promise<Container> {
    if (this.container) {
      await this.container.stop();
      await this.container.remove();
    }
    const docker = new Docker();
    if (!omitPull) {
      this.log.debug(`Pulling container image ${this.imageFqn} ...`);
      await Containers.pullImage(this.imageFqn);
      this.log.debug(`Pulled ${this.imageFqn} OK. Starting container...`);
    }

    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        this.imageFqn,
        [],
        [],
        {
          ExposedPorts: {
            [`${this.rpcToriiPort}/tcp`]: {}, // Iroha RPC - Torii
          },
          Env: this.envVars,
          Healthcheck: {
            Test: ["CMD-SHELL", "netcat -zv 127.0.0.1 50051 || exit 1"],
            Interval: 1000000000, // 1 second
            Timeout: 3000000000, // 3 seconds
            Retries: 299,
            StartPeriod: 3000000000, // 1 second
          },
          HostConfig: {
            PublishAllPorts: true,
            AutoRemove: true,
            // PortBindings: {
            //   "50051/tcp": [
            //     {
            //       HostPort: "50051",
            //     },
            //   ],
            // },
          },
        },
        {},
        (err: unknown) => {
          if (err) {
            reject(err);
          }
        },
      );

      eventEmitter.once("start", async (container: Container) => {
        this.log.debug(`Started container OK. Waiting for healthcheck...`);
        this.container = container;
        this.containerId = container.id;
        if (this.emitContainerLogs) {
          const logOptions = { follow: true, stderr: true, stdout: true };
          const logStream = await container.logs(logOptions);
          logStream.on("data", (data: Buffer) => {
            this.log.debug(`[${this.imageFqn}] %o`, data.toString("utf-8"));
          });
        }
        try {
          await this.waitForHealthCheck();
          this.log.debug(`Healthcheck passing OK.`);
          resolve(container);
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  public async waitForHealthCheck(timeoutMs = 180000): Promise<void> {
    const fnTag = "IrohaTestLedger#waitForHealthCheck()";
    const startedAt = Date.now();
    let isHealthy = false;
    do {
      if (Date.now() >= startedAt + timeoutMs) {
        throw new Error(`${fnTag} timed out (${timeoutMs}ms)`);
      }
      const containerInfo = await this.getContainerInfo();
      this.log.debug(`ContainerInfo.Status=%o`, containerInfo.Status);
      this.log.debug(`ContainerInfo.State=%o`, containerInfo.State);
      isHealthy = containerInfo.Status.endsWith("(healthy)");
      if (!isHealthy) {
        await new Promise((resolve2) => setTimeout(resolve2, 1000));
      }
    } while (!isHealthy);
  }

  public stop(): Promise<unknown> {
    return Containers.stop(this.container as Container);
  }

  public destroy(): Promise<unknown> {
    //remove volume
    const fnTag = "IrohaTestLedger#destroy()";
    //remove container
    if (this.container) {
      return this.container.remove();
    } else {
      const ex = new Error(`${fnTag} Container not found, nothing to destroy.`);
      return Promise.reject(ex);
    }
  }

  protected async getContainerInfo(): Promise<ContainerInfo> {
    const docker = new Docker();
    const image = this.imageFqn;
    const containerInfos = await docker.listContainers({});

    let aContainerInfo;
    if (this.containerId !== undefined) {
      aContainerInfo = containerInfos.find((ci) => ci.Id === this.containerId);
    }

    if (aContainerInfo) {
      return aContainerInfo;
    } else {
      throw new Error(`IrohaTestLedger#getContainerInfo() no image "${image}"`);
    }
  }

  public async getRpcToriiPort(): Promise<number> {
    const fnTag = "IrohaTestLedger#getRpcToriiPort()";
    const aContainerInfo = await this.getContainerInfo();
    const { rpcToriiPort: thePort } = this;
    const { Ports: ports } = aContainerInfo;

    if (ports.length < 1) {
      throw new Error(`${fnTag} no ports exposed or mapped at all`);
    }
    const mapping = ports.find((x) => x.PrivatePort === thePort);
    if (mapping) {
      if (!mapping.PublicPort) {
        throw new Error(`${fnTag} port ${thePort} mapped but not public`);
      } else if (mapping.IP !== "0.0.0.0") {
        throw new Error(`${fnTag} port ${thePort} mapped to localhost`);
      } else {
        return mapping.PublicPort;
      }
    } else {
      throw new Error(`${fnTag} no mapping found for ${thePort}`);
    }
  }

  public async getContainerIpAddress(): Promise<string> {
    const fnTag = "IrohaTestLedger#getContainerIpAddress()";
    const aContainerInfo = await this.getContainerInfo();

    if (aContainerInfo) {
      const { NetworkSettings } = aContainerInfo;
      const networkNames: string[] = Object.keys(NetworkSettings.Networks);
      if (networkNames.length < 1) {
        throw new Error(`${fnTag} container not connected to any networks`);
      } else {
        // return IP address of container on the first network that we found
        // it connected to. Make this configurable?
        return NetworkSettings.Networks[networkNames[0]].IPAddress;
      }
    } else {
      throw new Error(`${fnTag} cannot find image: ${this.imageName}`);
    }
  }

  private validateConstructorOptions(): void {
    const validationResult = Joi.validate<IIrohaTestLedgerOptions>(
      {
        irohaHost: this.irohaHost,
        //irohaPort: this.irohaPort,
        postgresHost: this.postgresHost,
        postgresPort: this.postgresPort,
        imageVersion: this.imageVersion,
        imageName: this.imageName,
        rpcToriiPort: this.rpcToriiPort,
        envVars: this.envVars,
      },
      IROHA_TEST_LEDGER_OPTIONS_JOI_SCHEMA,
    );

    if (validationResult.error) {
      throw new Error(
        `IrohaTestLedger#ctor ${validationResult.error.annotate()}`,
      );
    }
  }
}
