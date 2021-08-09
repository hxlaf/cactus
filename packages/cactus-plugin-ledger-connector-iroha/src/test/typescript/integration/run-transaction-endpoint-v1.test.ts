import http from "http";
import { AddressInfo } from "net";
import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { v4 as internalIpV4 } from "internal-ip";
import bodyParser from "body-parser";
import express from "express";
//import Promise from "bluebird";
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
  RunTransactionRequest,
} from "../../../main/typescript/public-api";

import { Configuration } from "@hyperledger/cactus-core-api";

import {
  IrohaCommand,
  IrohaQuery,
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
  const postgres = new PostgresTestContainer({ logLevel });

  test.onFinish(async () => {
    await postgres.stop();
  });

  await postgres.start();
  const postgresPort = await postgres.getPostgresPort();
  const postgresHost = await internalIpV4();
  if (!postgresHost) {
    throw new Error("Could not determine the internal IPV4 address.");
  }
  const iroha = new IrohaTestLedger({
    postgresHost,
    postgresPort,
    logLevel,
  });

  test.onFinish(async () => {
    await iroha.stop();
  });
  await iroha.start();

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
  const adminAccount = iroha.getGenesisAdminAccount();
  {
    const req = {
      commandName: IrohaCommand.CreateAccount,
      params: [
        "user1",
        "test",
        "fe31d7bc2dbe695b1cd5c706dde902d5fb6e6ce4b60e08418c842fdef5805230", //node4.pub
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
      commandName: IrohaQuery.GetAccount,
      params: [adminAccount],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    console.log(res.data.transactionReceipt);
    t.deepEqual(res.data.transactionReceipt, {
      accountId: adminAccount,
      domainId: "test",
      quorum: 1,
      jsonData: "{}",
    });
  }

  {
    const req = {
      commandName: IrohaCommand.CreateDomain,
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
      commandName: IrohaCommand.CreateAsset,
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
      commandName: IrohaQuery.GetAssetInfo,
      params: ["coolcoin#test"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, {
      assetId: "coolcoin#test",
      domainId: "test",
      precision: 3,
    });
  }

  {
    const req = {
      commandName: IrohaCommand.AddAssetQuantity,
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
      commandName: IrohaCommand.TransferAsset,
      params: [adminAccount, "user1@test", "coolcoin#test", "testTx", "57.75"],
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
      commandName: IrohaQuery.GetAccountAssets,
      params: [adminAccount, 100, "coolcoin#test"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, [
      {
        assetId: "coolcoin#test",
        accountId: adminAccount,
        balance: "65.373",
      },
    ]);
  }

  {
    const req = {
      commandName: IrohaQuery.GetAccountAssets,
      params: ["user1@test", 100, "coolcoin#test"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    console.log(res.data.transactionReceipt);
    t.deepEqual(res.data.transactionReceipt, [
      {
        assetId: "coolcoin#test",
        accountId: "user1@test",
        balance: "57.75",
      },
    ]);
  }

  {
    const req = {
      commandName: IrohaCommand.SubtractAssetQuantity,
      params: ["coolcoin#test", "30.123"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaQuery.GetAccountAssets,
      params: [adminAccount, 100, "coolcoin#test"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, [
      {
        assetId: "coolcoin#test",
        accountId: adminAccount,
        balance: "35.250",
      },
    ]);
  }

  {
    const req = {
      commandName: IrohaQuery.GetSignatories,
      params: [adminAccount],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEquals(res.data.transactionReceipt, [
      "313a07e6384776ed95447710d15e59148473ccfc052a681317a72a69f2a49910",
    ]);
  }

  {
    const req = {
      commandName: IrohaCommand.AddSignatory,
      params: [
        adminAccount,
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
      commandName: IrohaQuery.GetSignatories,
      params: [adminAccount],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, [
      "0000000000000000000000000000000000000000000000000000000000000001",
      "313a07e6384776ed95447710d15e59148473ccfc052a681317a72a69f2a49910",
    ]);
  }

  {
    const req = {
      commandName: IrohaCommand.RemoveSignatory,
      params: [
        adminAccount,
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
      commandName: IrohaQuery.GetSignatories,
      params: [adminAccount],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, [
      "313a07e6384776ed95447710d15e59148473ccfc052a681317a72a69f2a49910",
    ]);
  }

  {
    const req = {
      commandName: IrohaQuery.GetRoles,
      params: [],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, [
      "cactus_test",
      "cactus_test_full",
      "admin",
      "user",
      "money_creator",
    ]);
  }

  {
    const req = {
      commandName: IrohaQuery.GetRolePermissions,
      params: ["user"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    //Iroha Javascript SDK has an interface that maps each permission to an index number
    //For more info, please see:
    //https://github.com/hyperledger/iroha-javascript/blob/master/src/proto/primitive_pb.d.ts#L193-L247
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
    t.deepEqual(res.data.transactionReceipt, testArr);
  }

  {
    const req = {
      commandName: IrohaQuery.GetTransactions,
      params: [[firstTxHash]],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(
      res.data.transactionReceipt.array[0][0][0][0][0][0].slice(-1)[0],
      [adminAccount, "user1@test", "coolcoin#test", "testTx", "57.75"],
    );
  }

  {
    const req = {
      commandName: IrohaQuery.GetAccountTransactions,
      params: [adminAccount, 100, firstTxHash],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(
      res.data.transactionReceipt.transactionsList[0].payload.reducedPayload
        .commandsList,
      [
        {
          transferAsset: {
            srcAccountId: adminAccount,
            destAccountId: "user1@test",
            assetId: "coolcoin#test",
            description: "testTx",
            amount: "57.75",
          },
        },
      ],
    );
    t.equal(
      res.data.transactionReceipt.transactionsList[0].signaturesList[0]
        .publicKey,
      "313a07e6384776ed95447710d15e59148473ccfc052a681317a72a69f2a49910",
    );
  }

  {
    const req = {
      commandName: IrohaQuery.GetAccountAssetTransactions,
      params: [adminAccount, "coolcoin#test", 100, undefined],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.deepEqual(
      res.data.transactionReceipt.transactionsList[0].payload.reducedPayload
        .commandsList,
      [
        {
          transferAsset: {
            srcAccountId: adminAccount,
            destAccountId: "user1@test",
            assetId: "coolcoin#test",
            description: "testTx",
            amount: "57.75",
          },
        },
      ],
    );
    t.equal(
      res.data.transactionReceipt.transactionsList[0].signaturesList[0]
        .publicKey,
      "313a07e6384776ed95447710d15e59148473ccfc052a681317a72a69f2a49910",
    );
  }

  {
    const req = {
      commandName: IrohaQuery.GetPeers,
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, [
      {
        address: "127.0.0.1:10001",
        peerKey:
          "bddd58404d1315e0eb27902c5d7c8eb0602c16238f005773df406bc191308929",
        tlsCertificate: "",
      },
    ]);
  }

  {
    const req = {
      commandName: IrohaQuery.GetBlock,
      params: [1],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(
      res.data.transactionReceipt.payload.transactionsList[0].payload
        .reducedPayload.commandsList[0].addPeer.peer,
      {
        address: "127.0.0.1:10001",
        peerKey:
          "bddd58404d1315e0eb27902c5d7c8eb0602c16238f005773df406bc191308929",
        tlsCertificate: "",
      },
    );
  }

  {
    const req = {
      commandName: IrohaCommand.AppendRole,
      params: ["user1@test", "money_creator"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaCommand.DetachRole,
      params: ["user1@test", "money_creator"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaCommand.CreateRole,
      params: ["testrole", [6, 7]],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaCommand.GrantPermission,
      params: ["user1@test", "CAN_CALL_ENGINE_ON_MY_BEHALF"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaCommand.RevokePermission,
      params: ["user1@test", "CAN_CALL_ENGINE_ON_MY_BEHALF"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaCommand.SetAccountDetail,
      params: ["user1@test", "age", "18"],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaQuery.GetAccountDetail,
      params: ["user1@test", "age", adminAccount, 1, "age", adminAccount],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, {
      "admin@test": { age: "18" },
    });
  }

  {
    const req = {
      commandName: IrohaCommand.CompareAndSetAccountDetail,
      params: ["user1@test", "age", "118", "18"], //change age from 18 to 118
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaQuery.GetAccountDetail,
      params: ["user1@test", "age", adminAccount, 1, "age", adminAccount],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    console.log(res.data.transactionReceipt);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, {
      "admin@test": { age: "118" },
    });
  }

  // {
  //   const req = {
  //     commandName: "addPeer",
  //     params: [
  //       "192.168.10.10:50541",
  //       "0000000000000000000000000000000000000000000000000000000000000002",
  //     ],
  //   };
  //   const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
  //   t.ok(res);
  //   t.ok(res.data);
  //   t.equal(res.status, 200);
  //   t.equal(res.data.transactionReceipt.status, "COMMITTED");
  // }

  {
    const req = {
      commandName: IrohaQuery.GetEngineReceipts,
      params: [firstTxHash],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.deepEqual(res.data.transactionReceipt.array, [[]]);
  }

  {
    const req = {
      commandName: IrohaCommand.SetSettingValue,
      params: ["key", "value"],
    };
    await t.rejects(
      apiClient.runTransactionV1(req as RunTransactionRequest),
      /[\s\S]*/,
      "SetSettingValue transaction is rejected OK",
    );
  }

  {
    const req = {
      commandName: IrohaCommand.CallEngine,
      params: [
        undefined,
        adminAccount,
        "7C370993FD90AF204FD582004E2E54E6A94F2651",
        "40c10f19000000000000000000000000969453762b0c739dd285b31635efa00e24c2562800000000000000000000000000000000000000000000000000000000000004d2",
      ],
    };
    await t.rejects(
      apiClient.runTransactionV1(req as RunTransactionRequest),
      /[\s\S]*/,
      "CallEngine transaction is rejected OK",
    );
  }

  {
    const req = {
      commandName: IrohaCommand.AddSignatory,
      params: [
        adminAccount,
        "716fe505f69f18511a1b083915aa9ff73ef36e6688199f3959750db38b8f4bfc",
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
      commandName: IrohaCommand.SetAccountQuorum,
      params: [adminAccount, 2],
    };
    const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    console.log(res.data.transactionReceipt);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }

  // //  Use Promise.race to cancel the promise
  // {
  //   const req1 = {
  //     commandName: "producePendingTx",
  //     params: [],
  //   };
  //   Promise.race([
  //     //FIXME - the Iroha Javascript SDK does not give any output if we try to produce a pending transaction
  //     // This results in an infinite loop and thus the following code cannot be executed.
  //     // This fix is not perfect. It cancels the request with a timeout, but will result in grpc "Error: 14 UNAVAILABLE: GOAWAY received
  //     // Once the Iroha Javascript SDK is justitied. We can safely produce a pending transaction.
  //     apiClient.runTransactionV1(req1 as RunTransactionRequest),
  //     new Promise((resolve) => setTimeout(resolve, 1000)),
  //   ]);
  // }

  // {
  //   const req = {
  //     commandName: "getPendingTransactions",
  //     params: [5, undefined],
  //   };
  //   const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
  //   t.ok(res);
  //   t.ok(res.data);
  //   t.equal(res.status, 200);
  //   t.deepEqual(
  //     res.data.transactionReceipt[0].payload.reducedPayload.commandsList[0],
  //     { createAsset: { assetName: "coinb", domainId: "test", precision: 3 } },
  //   );
  //   t.equal(
  //     res.data.transactionReceipt[0].signaturesList[0].publicKey,
  //     "313a07e6384776ed95447710d15e59148473ccfc052a681317a72a69f2a49910",
  //   );
  // }

  // use bluebird to cancel Promise
  // {
  //   const req1 = {
  //     commandName: "producePendingTx",
  //     params: [],
  //   };
  //   const promise = apiClient.runTransactionV1(req1 as RunTransactionRequest);
  //   const p2 = new Promise((onCancel) => {
  //     promise;
  //     onCancel(() => console.log("p2 canceled"));
  //   });
  //   p2.cancel();
  // }

  // // {
  // //   const req = {
  // //     commandName: "removePeer",
  // //     params: [
  // //       "0000000000000000000000000000000000000000000000000000000000000002",
  // //     ],
  // //   };
  // //   const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
  // //   console.log(res.data.transactionReceipt);
  // // }

  // // {
  // //   const req = {
  // //     commandName: "fetchCommits",
  // //     params: [],
  // //   };
  // //   const res = await apiClient.runTransactionV1(req as RunTransactionRequest);
  // //   t.ok(res);
  // //   t.ok(res.data);
  // //   t.equal(res.status, 200);
  // //   console.log(res.data.transactionReceipt);
  // // }

  t.end();
});

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});
