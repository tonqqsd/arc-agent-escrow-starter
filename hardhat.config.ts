import "dotenv/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatEthersChaiMatchers from "@nomicfoundation/hardhat-ethers-chai-matchers";
import hardhatMocha from "@nomicfoundation/hardhat-mocha";
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";
import { defineConfig } from "hardhat/config";

const arcRpcUrl = process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network";
const privateKey = process.env.PRIVATE_KEY;

export default defineConfig({
  plugins: [hardhatEthers, hardhatEthersChaiMatchers, hardhatMocha, hardhatNetworkHelpers],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28"
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    }
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1"
    },
    arcTestnet: {
      type: "http",
      chainType: "l1",
      url: arcRpcUrl,
      accounts: privateKey ? [privateKey] : []
    }
  }
});
