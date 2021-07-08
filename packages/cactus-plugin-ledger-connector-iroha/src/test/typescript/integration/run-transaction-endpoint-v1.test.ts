//import http from "http";
//import { AddressInfo } from "net";

import test, { Test } from "tape-promise/tape";
//import { v4 as uuidv4 } from "uuid";

//import bodyParser from "body-parser";
//import express from "express";

import {
  Containers,
  //IrohaTestLedger,
  pruneDockerAllIfGithubAction,
  PostgresTestContainer,
  IrohaTestLedger,
} from "@hyperledger/cactus-test-tooling";
//import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  //IListenOptions,
  LogLevelDesc,
  //Servers,
} from "@hyperledger/cactus-common";
import * as grpc from "grpc";
import { CommandService_v1Client as CommandService } from "iroha-helpers-ts/lib/proto/endpoint_grpc_pb";
import { QueryService_v1Client as QueryService } from "iroha-helpers-ts/lib/proto/endpoint_grpc_pb";
import commands from "iroha-helpers-ts/lib/commands/index";
import queries from "iroha-helpers-ts/lib/queries";
//import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

// import {
//   PluginLedgerConnectorIroha,
//   DefaultApi as IrohaApi,
//   RunTransactionRequest,
// } from "../../../main/typescript/public-api";

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

  const IROHA_ADDRESS = "localhost:50051";

  const adminPriv =
    "f101537e319568c765b2cc89698325604991dca57b9716b58016b253506cab70";

  const commandService = new CommandService(
    IROHA_ADDRESS,
    grpc.credentials.createInsecure(),
  );

  const queryService = new QueryService(
    IROHA_ADDRESS,
    grpc.credentials.createInsecure(),
  );

  const commandOptions = {
    privateKeys: [adminPriv], // Array of private keys in hex format
    creatorAccountId: "admin@test", // Account id, ex. admin@test
    quorum: 1,
    commandService: commandService,
    timeoutLimit: 5000, // Set timeout limit
  };

  const queryOptions = {
    privateKey: adminPriv,
    creatorAccountId: "admin@test",
    queryService: queryService,
    timeoutLimit: 5000,
  };

  test.onFinish(async () => {
    await iroha.stop();
    //await iroha.destroy();
    await postgres.stop();
    //await postgres.destroy();
  });

  await postgres.start(); //start postgres first
  await iroha.start();

  // test cases
  await queries //get the default admin user
    .getAccount(queryOptions, { accountId: "admin@test" })
    .then((res: any) => {
      console.log("fetched account is" + res);
      t.equal(res.accountId, "admin@test");
      t.equal(res.domainId, "test");
      t.equal(res.quorum, 1);
    });

  await queries //test roles within the system
    .getRoles(queryOptions)
    .then((res: any) => {
      t.equal(res[0], "admin");
      t.equal(res[1], "user");
      t.equal(res[2], "money_creator");
    })
    .catch((err) => console.log(err));

  await queries //test query Admin account's signatures
    .getSignatories(queryOptions, { accountId: "admin@test" })
    .then((res: any) =>
      t.equal(
        res[0],
        "313a07e6384776ed95447710d15e59148473ccfc052a681317a72a69f2a49910",
      ),
    )
    .catch((err) => console.log(err));

  await queries //test get role's permission returns array of integers mappings?
    .getRolePermissions(queryOptions, { roleId: "money_creator" })
    .then((res) => console.log(res))
    .catch((err) => console.log(err));

  await commands
    .createDomain(commandOptions, {
      domainId: "test2",
      defaultRole: "admin",
    })
    .then((res: any) => {
      t.equal(res.status, "COMMITTED");
    })
    .catch((err) => console.log(err));

  await commands //create user
    .createAccount(commandOptions, {
      accountName: "testuser1",
      domainId: "test",
      publicKey:
        "0000000000000000000000000000000000000000000000000000000000000000",
    })
    .then((res: any) => {
      t.equal(res.status, "COMMITTED");
    })
    .catch((err) => {
      console.log(err);
    });
  await queries //query the created user
    .getAccount(queryOptions, { accountId: "testuser1@test" })
    .then((res: any) => {
      console.log("Queried account is" + res);
      t.equal(res.accountId, "testuser1@test");
      t.equal(res.domainId, "test");
      t.equal(res.quorum, 1);
    });
  // await commands //set quorum
  //   .setAccountQuorum(commandOptions, {
  //     accountId: "admin@test",
  //     quorum: 2,
  //   })
  //   .then((res: any) => {
  //     t.equal(res.quorum, 2);
  //   });
  // await commands  //setAccountdetail
  //   .setAccountDetail(commandOptions, {
  //     accountId: "testuser1@test",
  //     key: "jason",
  //     value: "statham",
  //   })
  //   .then((res: any) => {
  //     console.log(res);
  //   });
  await commands //test create asset (coolcoin#test; precision:3)
    .createAsset(commandOptions, {
      assetName: "coolcoin",
      domainId: "test",
      precision: 3,
    })
    .then((res: any) => {
      t.equal(res.status, "COMMITTED");
      console.log("printed txHash is" + res.txHash);
    })
    .catch((err) => {
      console.log(err);
    });
  await queries //query coolcoin
    .getAssetInfo(queryOptions, { assetId: "coolcoin#test" })
    .then((res: any) => {
      console.log(res);
      console.log("assetid is " + res.assetId);
      t.equal(res.assetId, "coolcoin#test");
      t.equal(res.domainId, "test");
      t.equal(res.precision, 3);
    })
    .catch((err: unknown) => {
      return console.log(err);
    });
  await commands
    .addAssetQuantity(commandOptions, {
      assetId: "coolcoin#test",
      amount: "123.123",
    })
    .then((res: any) => {
      console.log(res);
      t.equal(res.status, "COMMITTED");
    });
  await queries
    .getAccountAssets(queryOptions, {
      accountId: "admin@test",
      pageSize: 100,
      firstAssetId: "coolcoin#test",
    })
    .then((res: any) => {
      t.equal(res[0].balance, "123.123");
      t.equal(res[0].assetId, "coolcoin#test");
      t.equal(res[0].accountId, "admin@test");
    });

  await commands
    .transferAsset(commandOptions, {
      srcAccountId: "admin@test",
      destAccountId: "testuser1@test",
      assetId: "coolcoin#test",
      description: "testTx",
      amount: "57.75",
    })
    .then((res) => {
      console.log(res);
    })
    .catch((err) => console.log(err));

  // await queries
  //   .getAccountAssets(queryOptions, {
  //     accountId: "admin@test",
  //     pageSize: 100,
  //     firstAssetId: "coolcoin#test",
  //   })
  //   .then((res: any) => {
  //     t.equal(res[0].balance, "65.373");
  //     t.equal(res[0].assetId, "coolcoin#test");
  //     t.equal(res[0].accountId, "admin@test");
  //   });
  // await commands
  //   .subtractAssetQuantity(commandOptions, {
  //     assetId: "coolcoin#test",
  //     amount: "57.75",
  //   })
  //   .then((res: any) => {
  //     console.log(res);
  //     //t.equal(res.status, "COMMITTED");
  //   })
  //   .catch((err) => {
  //     console.log(err);
  //   });

  t.end();
});

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});
