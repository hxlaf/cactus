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

  // const IROHA_ADDRESS = "localhost:50051";

  // const adminPriv =
  //   "f101537e319568c765b2cc89698325604991dca57b9716b58016b253506cab70";

  // const commandService = new CommandService(
  //   IROHA_ADDRESS,
  //   grpc.credentials.createInsecure(),
  // );

  // const queryService = new QueryService(
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

  // const queryOptions = {
  //   privateKey: adminPriv,
  //   creatorAccountId: "admin@test",
  //   queryService: queryService,
  //   timeoutLimit: 5000,
  // };
  await postgres.start(); //start postgres first
  await iroha.start();
  // test.onFinish(async () => {
  //   await iroha.stop();
  //   //await iroha.destroy();
  //   await postgres.stop();
  //   //await postgres.destroy();
  // });

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

  connector.transact({
    commandName: "createAccount",
    params: [
      "testuser1",
      "test",
      "0000000000000000000000000000000000000000000000000000000000000000",
    ],
  });
  t.end();
});

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});
