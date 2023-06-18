const fs = require("fs");
const MotorRentalPlatform = artifacts.require("MotorRentalPlatform");

module.exports = async function (deployer) {
  await deployer.deploy(MotorRentalPlatform);
  const instance = await MotorRentalPlatform.deployed();
  let motorRentalPlatformAddress = await instance.address;

  let config = "export const MotorRentalPlatformAddress = " + motorRentalPlatformAddress;
  
  console.log("motorRentalPlatformAddress = " + motorRentalPlatformAddress);

  let data = JSON.stringify(config);

  fs.writeFileSync("config.js", JSON.parse(data));
};
