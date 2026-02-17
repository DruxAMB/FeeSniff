const { ethers } = require("ethers");

async function main() {
    const provider = new ethers.JsonRpcProvider("https://base.llamarpc.com");
    const walletAddress = "0xe7E637899c608DA9c15983f9749B03A071f48091";
    const lockerAddress = "0xF3622742b1E446D92e45E22923Ef11C2fcD55D68";

    // Most recent block
    const currentBlock = await provider.getBlockNumber();
    console.log("Current block:", currentBlock);

    // Search for WETH Transfer(Locker, Wallet, ...) in the last 100,000 blocks
    const transferEventTopic = ethers.id("Transfer(address,address,uint256)");
    const lockerTopic = ethers.zeroPadValue(lockerAddress.toLowerCase(), 32);
    const walletTopic = ethers.zeroPadValue(walletAddress.toLowerCase(), 32);

    console.log("Searching for WETH transfers from Locker to Wallet...");
    const logs = await provider.getLogs({
        address: "0x4200000000000000000000000000000000000006", // WETH
        topics: [transferEventTopic, lockerTopic, walletTopic],
        fromBlock: currentBlock - 100000,
        toBlock: "latest"
    });

    console.log(`Found ${logs.length} transfers.`);

    for (const log of logs.slice(-1)) {
        const txHash = log.transactionHash;
        console.log("Found Hash:", txHash);
        const tx = await provider.getTransaction(txHash);
        if (tx) {
            console.log("Input:", tx.data);
            const targetToken = "0xF35452565ABe5c1A81C8faA35169a754732b5B07".toLowerCase().substring(2);
            console.log("Target Token (no 0x):", targetToken);
            console.log("Match:", tx.data.toLowerCase().includes(targetToken));
        } else {
            console.log("Failed to fetch tx for hash.");
        }
    }
}

main();
