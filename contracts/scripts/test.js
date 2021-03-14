const {ethers, deployments} = require('@nomiclabs/buidler');

async function main() {
  console.log(deployments);
  const dungeonAdmin = await ethers.getContract('DungeonAdmin');
  const result = await dungeonAdmin.callStatic.getDungeonAndBackendAddress();
  console.log(result);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
