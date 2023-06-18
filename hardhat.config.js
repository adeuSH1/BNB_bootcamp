// hardhat.config.js
const { mnemonic, bscscanApiKey } = require ('./secrets.json');

require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-etherscan");
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {

  networks: {
    testnet: {
      url: `https://data-seed-prebsc-1-s1.binance.org:8545`,
      accounts: { mnemonic: mnemonic }
    },
    mainnet: {
      url: `https://bsc-dataseed.binance.org/`,
      accounts: { mnemonic: mnemonic }
    }
  },

  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://bscscan.com/
    apiKey: bscscanApiKey
  },
  solidity: "0.8.9"
};