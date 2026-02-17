const { ethers } = require("ethers");

async function main() {
    const rpcUrl = "https://base.llamarpc.com";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const lockerAddress = "0xF3622742b1E446D92e45E22923Ef11C2fcD55D68";
    const tokenAddress = "0xF35452565ABe5c1A81C8faA35169a754732b5B07";
    const feeOwner = "0xe7E637899c608DA9c15983f9749B03A071f48091";

    const lockerAbi = [
        "function availableFees(address feeOwner, address token) view returns (uint256)",
        "function feesToClaim(address feeOwner, address token) view returns (uint256)"
    ];

    const locker = new ethers.Contract(lockerAddress, lockerAbi, provider);

    console.log(`Checking fees for:`);
    console.log(`Token: ${tokenAddress}`);
    console.log(`Owner: ${feeOwner}`);

    try {
        const available = await locker.availableFees(feeOwner, tokenAddress);
        console.log(`availableFees: ${ethers.formatEther(available)} ETH`);

        const toClaim = await locker.feesToClaim(feeOwner, tokenAddress);
        console.log(`feesToClaim: ${ethers.formatEther(toClaim)} ETH`);
    } catch (err) {
        console.error("Error querying locker:", err.message);
    }
}

main();
