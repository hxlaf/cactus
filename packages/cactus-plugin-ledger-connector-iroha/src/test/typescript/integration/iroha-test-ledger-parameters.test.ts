import test, { Test } from "tape";
import { IrohaTestLedger } from "@hyperledger/cactus-test-tooling";

test("constructor does not throw with the default config", async (t: Test) => {
  t.plan(1);

  // No options
  const irohaTestLedger = new IrohaTestLedger();

  t.ok(irohaTestLedger);
  t.end();
});

test("Iroha environment variables passed correctly", async (t: Test) => {
  t.plan(2);
  const simpleEnvVars = [
    "BESU_MINER_ENABLED",
    "BESU_NETWORK=dev",
    "BESU_MIN_GAS_PRICE=0",
  ];

  const irohaOptions = {
    envVars: simpleEnvVars,
  };
  const irohaTestLedger = new IrohaTestLedger(irohaOptions);

  t.equal(irohaTestLedger.envVars, simpleEnvVars);
  t.ok(irohaTestLedger);
  t.end();
});

// test("deploys an Iroha Node on the Rinkeby network", async (t: Test) => {
//   t.plan(2);
//   const rinkebyNetworkEnvVars = [
//     "BESU_MOUNT_TYPE=bind",
//     "BESU_MINER_ENABLED",
//     "BESU_MINER_COINBASE=fe3b557e8fb62b89f4916b721be55ceb828dbd73",
//     "BESU_SOURCE=/<myvolume/besu/testnode>",
//     "BESU_NETWORK=rinkeby",
//     "BESU_MIN_GAS_PRICE=0",
//     "BESU_TARGET=/var/lib/besu hyperledger/besu:latest",
//   ];
//   const besuOptions = {
//     envVars: rinkebyNetworkEnvVars,
//   };

//   const irohaTestLedger = new IrohaTestLedger(irohaOptions);

//   t.equal(irohaTestLedger.envVars, rinkebyNetworkEnvVars);
//   t.ok(irohaTestLedger);
//   t.end();
// });

