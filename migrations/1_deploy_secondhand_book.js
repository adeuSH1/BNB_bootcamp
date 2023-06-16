const fs = require("fs");
const SecondhandBook = artifacts.require("SecondhandBook");

module.exports = async function (deployer) {
  await deployer.deploy(SecondhandBook);
  const instance = await SecondhandBook.deployed();
  let secondhandBookAddress = await instance.address;

  let config = "export const SecondhandBookAddress = " + secondhandBookAddress;
  
  console.log("secondhandBookAddress = " + secondhandBookAddress);

  let data = JSON.stringify(config);

  fs.writeFileSync("config.js", JSON.parse(data));
};
