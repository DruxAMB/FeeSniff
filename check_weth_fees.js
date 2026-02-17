const { ethers } = require("ethers");

async function main() {
    const rpcUrl = "https://base.llamarpc.com";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const lockerAddress = "0xF3622742b1E446D92e45E22923Ef11C2fcD55D68";
    const wethAddress = "0x4200000000000000000000000000000000000006";
    const feeOwner = "0xe7E637899c608DA9c15983f9749B03A071f48091";

    const lockerAbi = [
        "function availableFees(address feeOwner, address token) view returns (uint256)"
    ];

    const locker = new ethers.Contract(lockerAddress, lockerAbi, provider);

    console.log(`Checking WETH fees for Owner: ${feeOwner}`);

    try {
        const wethFees = await locker.availableFees(feeOwner, wethAddress);
        console.log(`Unclaimed WETH: ${ethers.formatEther(wethFees)} ETH`);
    } catch (err) {
        console.error("Error query WETH fees:", err.message);
    }
}

main();
