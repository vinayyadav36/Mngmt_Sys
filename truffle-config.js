try {
  require("dotenv").config();
} catch (error) {
  // dotenv is optional for local development
}

function createSepoliaProvider() {
  if (!process.env.MNEMONIC || !process.env.INFURA_API_KEY) {
    throw new Error("MNEMONIC and INFURA_API_KEY must be set for sepolia deployment.");
  }

  const HDWalletProvider = require("@truffle/hdwallet-provider");
  return new HDWalletProvider(
    process.env.MNEMONIC,
    `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`
  );
}

module.exports = {
  networks: {
    development: {
      host: process.env.DEV_HOST || "127.0.0.1",
      port: 7545, // Default Ganache port
      network_id: "*", // Match any network (Ganache default networkId varies by version)
      gas: 6721975,
      gasPrice: 20000000000
    },
    sepolia: {
      provider: createSepoliaProvider,
      network_id: 11155111,
      gas: 5500000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    }
  },
  
  // Set default mocha options here, use special reporters etc.
  mocha: {
    timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "node_modules/solc",  // use locally installed solc@0.8.13
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  }
};