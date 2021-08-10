import http from "http";
import { AddressInfo } from "net";
import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { v4 as internalIpV4 } from "internal-ip";
import bodyParser from "body-parser";
import express from "express";
import {
  Containers,
  //IrohaTestLedger,
  pruneDockerAllIfGithubAction,
  PostgresTestContainer,
  IrohaTestLedger,
} from "@hyperledger/cactus-test-tooling";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginImportType } from "@hyperledger/cactus-core-api";

import {
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";

import {
  PluginLedgerConnectorIroha,
  DefaultApi as IrohaApi,
  //RunTransactionRequest,
  PluginFactoryLedgerConnector,
  //RunTransactionResponse,
} from "../../../main/typescript/public-api";

import { Configuration } from "@hyperledger/cactus-core-api";

import {
  IrohaCommand,
  IrohaQuery,
  //RunTransactionResponse,
  //IrohaQuery,
} from "../../../main/typescript/generated/openapi/typescript-axios";

const testCase = "runs tx on an Iroha v1.2.0 ledger";
const logLevel: LogLevelDesc = "INFO";

test.onFailure(async () => {
  await Containers.logDiagnostics({ logLevel });
});

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const postgres1 = new PostgresTestContainer({ logLevel });
  const postgres2 = new PostgresTestContainer({ logLevel });
  test.onFinish(async () => {
    await postgres1.stop();
    await postgres2.stop();
  });

  await postgres1.start();
  const postgresHost1 = await internalIpV4();
  const postgresPort1 = await postgres1.getPostgresPort();
  const irohaHost1 = await internalIpV4();
  await postgres2.start();
  const postgresHost2 = await internalIpV4();
  const postgresPort2 = await postgres2.getPostgresPort();
  const irohaHost2 = await internalIpV4();
  if (!postgresHost1 || !irohaHost1 || !postgresHost2 || !irohaHost2) {
    throw new Error("Could not determine the internal IPV4 address.");
  }
  const iroha1 = new IrohaTestLedger({
    irohaHost: irohaHost1,
    //irohaPort,
    postgresHost: postgresHost1,
    postgresPort: postgresPort1,
    //TODO: pubkey (peerkey)
    logLevel: logLevel,
  });

  const iroha2 = new IrohaTestLedger({
    irohaHost: irohaHost2,
    //irohaPort,
    postgresHost: postgresHost2,
    postgresPort: postgresPort2,
    //irohaHost,
    //irohaPort,
    //TODO: pubkey (peerkey)
    logLevel: logLevel,
  });

  test.onFinish(async () => {
    await iroha1.stop();
    await iroha2.stop();
  });
  await iroha1.start();
  await iroha2.start();
  const irohaPort1 = await iroha1.getRpcToriiPort();
  const rpcToriiPortHost1 = await iroha1.getRpcToriiPortHost();
  const irohaPort2 = await iroha2.getRpcToriiPort();
  console.log(irohaPort2);
  const rpcToriiPortHost2 = await iroha2.getRpcToriiPortHost();
  console.log(rpcToriiPortHost2);
  //start 2 connectors for 2 iroha ledgers
  const factory1 = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.Local,
  });
  const connector1: PluginLedgerConnectorIroha = await factory1.create({
    rpcToriiPortHost: rpcToriiPortHost1,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry(),
  });
  const factory2 = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.Local,
  });
  const connector2: PluginLedgerConnectorIroha = await factory2.create({
    rpcToriiPortHost: rpcToriiPortHost2,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry(),
  });
  //register the 2 connectors with 2 express services
  const expressApp1 = express();
  expressApp1.use(bodyParser.json({ limit: "250mb" }));
  const server1 = http.createServer(expressApp1);
  const listenOptions1: IListenOptions = {
    hostname: "0.0.0.0",
    port: 0,
    server: server1,
  };
  const addressInfo1 = (await Servers.listen(listenOptions1)) as AddressInfo;
  test.onFinish(async () => await Servers.shutdown(server1));
  const apiHost1 = `http://${addressInfo1.address}:${addressInfo1.port}`;
  const apiConfig1 = new Configuration({ basePath: apiHost1 });
  const apiClient1 = new IrohaApi(apiConfig1);

  const expressApp2 = express();
  expressApp2.use(bodyParser.json({ limit: "250mb" }));
  const server2 = http.createServer(expressApp2);
  const listenOptions2: IListenOptions = {
    hostname: "0.0.0.0",
    port: 0,
    server: server2,
  };
  const addressInfo2 = (await Servers.listen(listenOptions2)) as AddressInfo;
  test.onFinish(async () => await Servers.shutdown(server2));
  const apiHost2 = `http://${addressInfo2.address}:${addressInfo2.port}`;
  const apiConfig2 = new Configuration({ basePath: apiHost2 });
  const apiClient2 = new IrohaApi(apiConfig2);

  await connector1.getOrCreateWebServices();
  await connector1.registerWebServices(expressApp1);
  await connector2.getOrCreateWebServices();
  await connector2.registerWebServices(expressApp2);

  //Setup: create coolcoin#test for Iroha1
  {
    const req = {
      commandName: IrohaCommand.CreateAsset,
      baseConfig: {
        irohaHost: irohaHost1,
        irohaPort: irohaPort1,
        creatorAccountId: "admin@test",
        privKey: [
          "f101537e319568c765b2cc89698325604991dca57b9716b58016b253506cab70",
        ],
        quorum: 1,
        timeoutLimit: 5000,
      },
      params: ["coolcoin", "test", 3],
    };
    const res = await apiClient1.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }
  //Setup: create coolcoin#test for Iroha2
  {
    const req = {
      commandName: IrohaCommand.CreateAsset,
      baseConfig: {
        irohaHost: irohaHost2,
        irohaPort: irohaPort2,
        creatorAccountId: "admin@test",
        privKey: [
          "f101537e319568c765b2cc89698325604991dca57b9716b58016b253506cab70",
        ],
        quorum: 1,
        timeoutLimit: 5000,
      },
      params: ["coolcoin", "test", 3],
    };
    const res = await apiClient2.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }
  //Iroha1's admin is initialized with 100 (coolcoin#test).
  {
    const req = {
      commandName: IrohaCommand.AddAssetQuantity,
      baseConfig: {
        irohaHost: irohaHost1,
        irohaPort: irohaPort1,
        creatorAccountId: "admin@test",
        privKey: [
          "f101537e319568c765b2cc89698325604991dca57b9716b58016b253506cab70",
        ],
        quorum: 1,
        timeoutLimit: 5000,
      },
      params: ["coolcoin#test", "100.000"],
    };
    const res = await apiClient1.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }

  // Iroha1's admin transfers 30 (coolcoin#test) to Iroha2's admin.
  // i.e., Iroha1's admin subtracts 30 (coolcoin#test).
  {
    const req = {
      commandName: IrohaCommand.SubtractAssetQuantity,
      baseConfig: {
        irohaHost: irohaHost1,
        irohaPort: irohaPort1,
        creatorAccountId: "admin@test",
        privKey: [
          "f101537e319568c765b2cc89698325604991dca57b9716b58016b253506cab70",
        ],
        quorum: 1,
        timeoutLimit: 5000,
      },
      params: ["coolcoin#test", "30.000"],
    };
    const res = await apiClient1.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }
  //i.e., Iroha2's admin adds 30 (coolcoin#test).
  {
    const req = {
      commandName: IrohaCommand.AddAssetQuantity,
      baseConfig: {
        irohaHost: irohaHost2,
        irohaPort: irohaPort2,
        creatorAccountId: "admin@test",
        privKey: [
          "f101537e319568c765b2cc89698325604991dca57b9716b58016b253506cab70",
        ],
        quorum: 1,
        timeoutLimit: 5000,
      },
      params: ["coolcoin#test", "30.000"],
    };
    const res = await apiClient2.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }
  //Verification: iroha1's admin has 70 (coolcoin#test).
  {
    const req = {
      commandName: IrohaQuery.GetAccountAssets,
      baseConfig: {
        irohaHost: irohaHost1,
        irohaPort: irohaPort1,
        creatorAccountId: "admin@test",
        privKey: [
          "f101537e319568c765b2cc89698325604991dca57b9716b58016b253506cab70",
        ],
        quorum: 1,
        timeoutLimit: 5000,
      },
      params: ["admin@test", 10, "coolcoin#test"],
    };
    const res = await apiClient1.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, [
      {
        assetId: "coolcoin#test",
        accountId: "admin@test",
        balance: "70.000",
      },
    ]);
  }
  //Verification: iroha2's admin has 30 (coolcoin#test).
  {
    const req = {
      commandName: IrohaQuery.GetAccountAssets,
      baseConfig: {
        irohaHost: irohaHost2,
        irohaPort: irohaPort2,
        creatorAccountId: "admin@test",
        privKey: [
          "f101537e319568c765b2cc89698325604991dca57b9716b58016b253506cab70",
        ],
        quorum: 1,
        timeoutLimit: 5000,
      },
      params: ["admin@test", 10, "coolcoin#test"],
    };
    const res = await apiClient2.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, [
      {
        assetId: "coolcoin#test",
        accountId: "admin@test",
        balance: "30.000",
      },
    ]);
  }
  t.end();
});

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});
