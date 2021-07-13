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
    containerImageVersion: "1.20c",
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
  const firstTxHash = responseToTransfer.transactionReceipt.txHash;

  const respToAccAsset = await connector.transact({
    commandName: "getAccountAssets",
    params: ["admin@test", 100, "coolcoin#test"],
  });
  console.log(respToAccAsset);
  t.equal(respToAccAsset.transactionReceipt[0].assetId, "coolcoin#test");
  t.equal(respToAccAsset.transactionReceipt[0].accountId, "admin@test");
  t.equal(respToAccAsset.transactionReceipt[0].balance, "65.373");

  const respToAccAsset2 = await connector.transact({
    commandName: "getAccountAssets",
    params: ["user1@test", 100, "coolcoin#test"],
  });
  console.log(respToAccAsset2);
  t.equal(respToAccAsset2.transactionReceipt[0].assetId, "coolcoin#test");
  t.equal(respToAccAsset2.transactionReceipt[0].accountId, "user1@test");
  t.equal(respToAccAsset2.transactionReceipt[0].balance, "57.75");

  const respToSubAsset = await connector.transact({
    commandName: "subtractAssetQuantity",
    params: ["coolcoin#test", "30.123"],
  });
  t.equal(respToSubAsset.transactionReceipt.status, "COMMITTED");
  t.equal(respToAccAsset.transactionReceipt[0].assetId, "coolcoin#test");
  t.equal(respToAccAsset.transactionReceipt[0].accountId, "admin@test");
  t.equal(respToAccAsset.transactionReceipt[0].balance, "35.250");

  const respToAccAsset3 = await connector.transact({
    commandName: "getAccountAssets",
    params: ["admin@test", 100, "coolcoin#test"],
  });
  console.log(respToAccAsset3);

  const respToGetRoles = await connector.transact({
    commandName: "getRoles",
    params: [],
  });
  console.log(respToGetRoles);
  t.equal(respToGetRoles.transactionReceipt[0], "cactus_test");
  t.equal(respToGetRoles.transactionReceipt[1], "cactus_test_full");
  t.equal(respToGetRoles.transactionReceipt[2], "admin");
  t.equal(respToGetRoles.transactionReceipt[3], "user");
  t.equal(respToGetRoles.transactionReceipt[4], "money_creator");

  const respToGetRolePermission = await connector.transact({
    commandName: "getRolePermissions",
    params: ["user"],
  });
  console.log(respToGetRolePermission);
  const testArr = [
    6,
    7,
    8,
    12,
    13,
    17,
    20,
    23,
    26,
    29,
    32,
    35,
    37,
    38,
    39,
    40,
    41,
  ];
  for (let i = 0; i < testArr.length; i++) {
    t.equal(respToGetRolePermission.transactionReceipt[i], testArr[i]);
  }

  const respToGetAccTx = await connector.transact({
    commandName: "getAccountTransactions",
    params: ["admin@test", 100, firstTxHash],
  });
  console.log(respToGetAccTx);

  const respToGetAccAssetTx = await connector.transact({
    commandName: "getAccountAssetTransactions",
    params: ["admin@test", "coolcoin#test", 100, firstTxHash],
  });
  console.log(respToGetAccAssetTx);

  const respToGetTx = await connector.transact({
    commandName: "getTransactions",
    params: [[firstTxHash]],
  });
  console.log(respToGetTx);

  // const respToRevoke = await connector.transact({
  //   commandName: "revokePermission",
  //   params: ["user1@test", [6]],
  // });
  // console.log(respToRevoke);

  // const respToGrantPermissions = await connector.transact({
  //   commandName: "grantPermission",
  //   params: ["user1@test", testArr],
  // });
  // console.log(respToGrantPermissions);

  // const respToCreateRole = await connector.transact({
  //   commandName: "createRole",
  //   params: ["testrole", testArr],
  // });
  // console.log(respToCreateRole);

  // const respToAppendRole = await connector.transact({
  //   commandName: "appendRole",
  //   params: ["user1@test", "money_creator"],
  // });
  // console.log(respToAppendRole);
  // const respToAddSign = await connector.transact({
  //   commandName: "addSignatory",
  //   params: [
  //     "user1@test",
  //     "0000000000000000000000000000000000000000000000000000000000000001",
  //   ],
  // });
  // console.log(respToAddSign);

  t.end();
});

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});
