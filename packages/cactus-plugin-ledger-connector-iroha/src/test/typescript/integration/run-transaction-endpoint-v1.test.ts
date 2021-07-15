import http from "http";
import { AddressInfo } from "net";

import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";

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
//import * as grpc from "grpc";
//import { CommandService_v1Client as CommandService } from "iroha-helpers-ts/lib/proto/endpoint_grpc_pb";
//import { QueryService_v1Client as QueryService } from "iroha-helpers-ts/lib/proto/endpoint_grpc_pb";
//import commands from "iroha-helpers-ts/lib/commands/index";
//import queries from "iroha-helpers-ts/lib/queries";
//import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import {
  PluginLedgerConnectorIroha,
  DefaultApi as IrohaApi,
  //RunTransactionRequest,
  PluginFactoryLedgerConnector,
  RunTransactionRequest,
} from "../../../main/typescript/public-api";

//import { IPluginLedgerConnectorIrohaOptions } from "../../../main/typescript/plugin-ledger-connector-iroha";
//import { DiscoveryOptions } from "iroha-network";
import { Configuration } from "@hyperledger/cactus-core-api";

/**
 * Use this to debug issues with the Iroha node SDK
 * ```sh
 * export HFC_LOGGING='{"debug":"console","info":"console"}'
 * ```
 */
// class IrohaResponse {
//   txHash!: string;
//   status!: string;

//   IrohaResponse(txHash: string, status: string) {
//     this.txHash = txHash;
//     this.status = status;
//   }
// }

// function setIrohaResp(resp: IrohaResponse) {
//   let irohaRes = new IrohaResponse();
//   irohaRes = resp;
//   console.log("sending iroha response :: %s\n", JSON.stringify(irohaRes));
//   return irohaRes;
// }

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

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "0.0.0.0",
    port: 0,
    server,
  };
  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  test.onFinish(async () => await Servers.shutdown(server));
  const { address, port } = addressInfo;
  const apiHost = `http://${address}:${port}`;
  const apiConfig = new Configuration({ basePath: apiHost });
  const apiClient = new IrohaApi(apiConfig);

  await connector.getOrCreateWebServices();
  await connector.registerWebServices(expressApp);

  let firstTxHash;
  {
    const req = {
      commandName: "createAccount",
      params: [
        "user1",
        "test",
        "0000000000000000000000000000000000000000000000000000000000000000",
      ],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }

  {
    const req = {
      commandName: "getAccount",
      params: ["admin@test"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.accountId, "admin@test");
    t.equal(res.data.transactionReceipt.domainId, "test");
    t.equal(res.data.transactionReceipt.quorum, 1);
  }

  {
    const req = {
      commandName: "createDomain",
      params: ["test2", "admin"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }

  {
    const req = {
      commandName: "createAsset",
      params: ["coolcoin", "test", 3],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }

  {
    const req = {
      commandName: "getAssetInfo",
      params: ["coolcoin#test"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.assetId, "coolcoin#test");
    t.equal(res.data.transactionReceipt.domainId, "test");
    t.equal(res.data.transactionReceipt.precision, 3);
  }

  {
    const req = {
      commandName: "addAssetQuantity",
      params: ["coolcoin#test", "123.123"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }

  {
    const req = {
      commandName: "transferAsset",
      params: ["admin@test", "user1@test", "coolcoin#test", "testTx", "57.75"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
    firstTxHash = res.data.transactionReceipt.txHash;
  }

  {
    const req = {
      commandName: "getAccountAssets",
      params: ["admin@test", 100, "coolcoin#test"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt[0].assetId, "coolcoin#test");
    t.equal(res.data.transactionReceipt[0].accountId, "admin@test");
    t.equal(res.data.transactionReceipt[0].balance, "65.373");
  }

  {
    const req = {
      commandName: "getAccountAssets",
      params: ["user1@test", 100, "coolcoin#test"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt[0].assetId, "coolcoin#test");
    t.equal(res.data.transactionReceipt[0].accountId, "user1@test");
    t.equal(res.data.transactionReceipt[0].balance, "57.75");
  }

  {
    const req = {
      commandName: "subtractAssetQuantity",
      params: ["coolcoin#test", "30.123"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
    console.log(res.data.transactionReceipt);
  }

  {
    const req = {
      commandName: "getAccountAssets",
      params: ["admin@test", 100, "coolcoin#test"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt[0].assetId, "coolcoin#test");
    t.equal(res.data.transactionReceipt[0].accountId, "admin@test");
    t.equal(res.data.transactionReceipt[0].balance, "35.250");
  }

  {
    const req = {
      commandName: "getSignatories",
      params: ["admin@test"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    console.log(res.data.transactionReceipt);
    t.equal(
      res.data.transactionReceipt[0],
      "313a07e6384776ed95447710d15e59148473ccfc052a681317a72a69f2a49910",
    );
  }

  {
    const req = {
      commandName: "addSignatory",
      params: [
        "admin@test",
        "0000000000000000000000000000000000000000000000000000000000000001",
      ],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }

  {
    const req = {
      commandName: "getSignatories",
      params: ["admin@test"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    console.log(res.data.transactionReceipt);
    t.equal(
      res.data.transactionReceipt[0],
      "0000000000000000000000000000000000000000000000000000000000000001",
    );
    t.equal(
      res.data.transactionReceipt[1],
      "313a07e6384776ed95447710d15e59148473ccfc052a681317a72a69f2a49910",
    );
  }

  // {
  //   const req = {
  //     commandName: "setAccountQuorum",
  //     params: ["admin@test", 2],
  //   };
  //   const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
  //   t.ok(res);
  //   t.ok(res.data);
  //   t.equal(res.status, 200);
  //   console.log(res.data.transactionReceipt);
  //   t.equal(res.data.transactionReceipt.status, "COMMITTED");
  // }

  {
    const req = {
      commandName: "removeSignatory",
      params: [
        "admin@test",
        "0000000000000000000000000000000000000000000000000000000000000001",
      ],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }
  // {
  //   const req = {
  //     commandName: "setAccountQuorum",
  //     params: ["admin@test", 1],
  //   };
  //   const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
  //   t.ok(res);
  //   t.ok(res.data);
  //   t.equal(res.status, 200);
  //   console.log(res.data.transactionReceipt);
  //   t.equal(res.data.transactionReceipt.status, "COMMITTED");
  // }
  {
    const req = {
      commandName: "getSignatories",
      params: ["admin@test"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    console.log(res.data.transactionReceipt);
    t.equal(
      res.data.transactionReceipt[0],
      "313a07e6384776ed95447710d15e59148473ccfc052a681317a72a69f2a49910",
    );
  }

  {
    const req = {
      commandName: "getRoles",
      params: [],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt[0], "cactus_test");
    t.equal(res.data.transactionReceipt[1], "cactus_test_full");
    t.equal(res.data.transactionReceipt[2], "admin");
    t.equal(res.data.transactionReceipt[3], "user");
    t.equal(res.data.transactionReceipt[4], "money_creator");
  }

  {
    const req = {
      commandName: "getRolePermissions",
      params: ["user"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
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
      t.equal(res.data.transactionReceipt[i], testArr[i]);
    }
  }

  {
    const req = {
      commandName: "getTransactions",
      params: [[firstTxHash]],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    const tmpArr = res.data.transactionReceipt.array[0][0][0][0][0][0];
    const tmpArr2 = tmpArr[tmpArr.length - 1];
    t.equal(tmpArr2[0], "admin@test");
    t.equal(tmpArr2[1], "user1@test");
    t.equal(tmpArr2[2], "coolcoin#test");
    t.equal(tmpArr2[3], "testTx");
    t.equal(tmpArr2[4], "57.75");
  }

  {
    const req = {
      commandName: "getAccountTransactions",
      params: ["admin@test", 100, firstTxHash],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    console.log(res.data.transactionReceipt.transactionsList);
  }

  // const responseToTransfer = await connector.transact({
  //   commandName: "transferAsset",
  //   params: ["admin@test", "user1@test", "coolcoin#test", "testTx", "57.75"],
  // });
  // t.equal(responseToTransfer.transactionReceipt.status, "COMMITTED");
  // const firstTxHash = responseToTransfer.transactionReceipt.txHash;

  // const respToGetAccTx = await connector.transact({
  //   commandName: "getAccountTransactions",
  //   params: ["admin@test", 100, firstTxHash],
  // });
  // console.log(respToGetAccTx);

  // const respToGetAccAssetTx = await connector.transact({
  //   commandName: "getAccountAssetTransactions",
  //   params: ["admin@test", "coolcoin#test", 100, firstTxHash],
  // });
  // console.log(respToGetAccAssetTx);

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
