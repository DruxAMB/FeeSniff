
const { ethers } = require("ethers");

const tokenAddress = "0x1e59A76e58E07e988d97aa7d89Eb15dc4BF18b07";
const rpcUrl = "https://base.publicnode.com";

async function test() {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(tokenAddress, ["function totalSupply() view returns (uint256)", "function decimals() view returns (uint8)"], provider);

    const [supply, decimals] = await Promise.all([contract.totalSupply(), contract.decimals()]);
    console.log(`Supply: ${supply.toString()}`);
    console.log(`Decimals: ${decimals}`);

    // Top holder from previous test: 83250095327210745181971385236
    const topHolderValue = BigInt("83250095327210745181971385236");
    const percent = (topHolderValue * 10000n / supply);
    console.log(`Top holder percent: ${Number(percent) / 100}%`);
}

test();
