//import http from "http";
//import { AddressInfo } from "net";

import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";

//import bodyParser from "body-parser";
//import express from "express";

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
  //IListenOptions,
  LogLevelDesc,
  //Servers,
} from "@hyperledger/cactus-common";
//import * as grpc from "grpc";
//import { CommandService_v1Client as CommandService } from "iroha-helpers-ts/lib/proto/endpoint_grpc_pb";
//import { QueryService_v1Client as QueryService } from "iroha-helpers-ts/lib/proto/endpoint_grpc_pb";
//import commands from "iroha-helpers-ts/lib/commands/index";
//import queries from "iroha-helpers-ts/lib/queries";
//import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import {
  PluginLedgerConnectorIroha,
  //DefaultApi as IrohaApi,
  //RunTransactionRequest,
  PluginFactoryLedgerConnector,
} from "../../../main/typescript/public-api";

//import { IPluginLedgerConnectorIrohaOptions } from "../../../main/typescript/plugin-ledger-connector-iroha";
//import { DiscoveryOptions } from "iroha-network";
//import { Configuration } from "@hyperledger/cactus-core-api";

/**
 * Use this to debug issues with the Iroha node SDK
 * ```sh
 * export HFC_LOGGING='{"debug":"console","info":"console"}'
 * ```
 */

const testCase = "runs tx on an Iroha v1.2.0 ledger";
const logLevel: LogLevelDesc = "TRACE";

test.onFailure(async () => {
  await Containers.logDiagnostics({ logLevel });
});

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const postgres = new PostgresTestContainer({
    containerImageName: "postgres",
    containerImageVersion: "9.5-alpine",
    postgresPort: 5432,
    envVars: ["POSTGRES_USER=postgres", "POSTGRES_PASSWORD=mysecretpassword"],
  });

  const iroha = new IrohaTestLedger({
    containerImageVersion: "1.20b",
    containerImageName: "hanxyz/iroha",
    rpcToriiPort: 50051,
    //logLevel: "TRACE",
    envVars: [
      "IROHA_POSTGRES_HOST=postgres_1",
      "IROHA_POSTGRES_PORT=5432",
      "IROHA_POSTGRES_USER=postgres",
      "IROHA_POSTGRES_PASSWORD=mysecretpassword",
      "KEY=node0",
    ],
  });

  await postgres.start(); //start postgres first
  await iroha.start();
  test.onFinish(async () => {
    await iroha.stop();
    //await iroha.destroy();
    await postgres.stop();
    //await postgres.destroy();
  });

  const rpcToriiPortHost = await iroha.getRpcToriiPortHost();
  const factory = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.Local,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const connector: PluginLedgerConnectorIroha = await factory.create({
    rpcToriiPortHost,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry(),
  });

  const respToCreateDomain = await connector.transact({
    commandName: "createDomain",
    params: ["test2", "admin"],
  });
  t.equal(respToCreateDomain.transactionReceipt.status, "COMMITTED");

  const respQuerySign = await connector.transact({
    commandName: "getSignatories",
    params: ["admin@test"],
  });
  console.log(respQuerySign);
  t.equal(
    respQuerySign.transactionReceipt[0],
    "313a07e6384776ed95447710d15e59148473ccfc052a681317a72a69f2a49910",
  );

  const respToCreateAccount = await connector.transact({
    commandName: "createAccount",
    params: [
      "user1",
      "test",
      "0000000000000000000000000000000000000000000000000000000000000000",
    ],
  });
  console.log(respToCreateAccount.transactionReceipt.txHash);
  t.equal(respToCreateAccount.transactionReceipt.status, "COMMITTED");

  const respToGetAcc = await connector.transact({
    commandName: "getAccount",
    params: ["admin@test"],
  });
  console.log(respToGetAcc);
  t.equal(respToGetAcc.transactionReceipt.accountId, "admin@test");
  t.equal(respToGetAcc.transactionReceipt.domainId, "test");
  t.equal(respToGetAcc.transactionReceipt.quorum, 1);

  const respToGetAcc2 = await connector.transact({
    commandName: "getAccount",
    params: ["user1@test"],
  });
  console.log(respToGetAcc2);
  t.equal(respToGetAcc2.transactionReceipt.accountId, "user1@test");
  t.equal(respToGetAcc2.transactionReceipt.domainId, "test");
  t.equal(respToGetAcc2.transactionReceipt.quorum, 1);

  const respToGetRawAcc = await connector.transact({
    commandName: "getRawAccount",
    params: ["user1@test"],
  });
  console.log(respToGetRawAcc);

  const respToCreateAsset = await connector.transact({
    commandName: "createAsset",
    params: ["coolcoin", "test", 3],
  });
  console.log(respToCreateAsset.transactionReceipt.txHash);
  t.equal(respToCreateAsset.transactionReceipt.status, "COMMITTED");

  const respToGetAssetInfo = await connector.transact({
    commandName: "getAssetInfo",
    params: ["coolcoin#test"],
  });
  console.log(respToGetAssetInfo);
  t.equal(respToGetAssetInfo.transactionReceipt.assetId, "coolcoin#test");
  t.equal(respToGetAssetInfo.transactionReceipt.domainId, "test");
  t.equal(respToGetAssetInfo.transactionReceipt.precision, 3);

  const respToAddAsset = await connector.transact({
    commandName: "addAssetQuantity",
    params: ["coolcoin#test", "123.123"],
  });
  t.equal(respToAddAsset.transactionReceipt.status, "COMMITTED");

  const responseToTransfer = await connector.transact({
    commandName: "transferAsset",
    params: ["admin@test", "user1@test", "coolcoin#test", "testTx", "57.75"],
  });
  t.equal(responseToTransfer.transactionReceipt.status, "COMMITTED");

  // const IROHA_ADDRESS = "localhost:50051";

  // const adminPriv =
  //   "f101537e319568c765b2cc89698325604991dca57b9716b58016b253506cab70";

  // const commandService = new CommandService(
  //   IROHA_ADDRESS,
  //   grpc.credentials.createInsecure(),
  // );

  // const commandOptions = {
  //   privateKeys: [adminPriv], // Array of private keys in hex format
  //   creatorAccountId: "admin@test", // Account id, ex. admin@test
  //   quorum: 1,
  //   commandService: commandService,
  //   timeoutLimit: 5000, // Set timeout limit
  // };

  // await commands
  //   .transferAsset(commandOptions, {
  //     srcAccountId: "admin@test",
  //     destAccountId: "testuser1@test",
  //     assetId: "coolcoin#test",
  //     description: "testTx",
  //     amount: "57.75",
  //   })
  //   .then((res) => {
  //     console.log(res);
  //   })
  //   .catch((err) => console.log(err));
  t.end();
});

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});
