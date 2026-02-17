const { ethers } = require("ethers");

async function main() {
    const rpcUrl = "https://base.llamarpc.com";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const hashes = [
        "0xea6f00129cf9df271f30835f8cc3d6666be5562c", // truncated? No, these were just previews in previous logs.
        // Let's find full ones from the user's screenshot description if possible.
        // Wait, the user's screenshot has these listed in 'Recent Fee Transactions'.
    ];

    // I can't use partial hashes.
    // I will list recent transactions for the creator wallet and find ones where 'to' is the locker.

    const walletAddress = "0xe7E637899c608DA9c15983f9749B03A071f48091";
    const lockerAddress = "0xF3622742b1E446D92e45E22923Ef11C2fcD55D68";
    const targetToken = "0xF35452565ABe5c1A81C8faA35169a754732b5B07".toLowerCase();

    // Use eth_getLogs for the claim event if it exists
    // Locker might emit "FeesClaimed(address token, address feeOwner, uint256 amount)"

    console.log("Searching for recent transactions from Wallet to Locker...");
    const filter = {
        address: lockerAddress,
        fromBlock: 24700000, // Very recent
        toBlock: "latest"
    };

    // Let's just find the transactions where the wallet sent data to the locker.
    // Since I can't easily list transactions for an address via standard RPC without a custom indexer,
    // and I'm on Base, I'll try to find any WETH transfer logs from the Locker in the last 1000 blocks.

    const wethAddress = "0x4200000000000000000000000000000000000006";
    const wethTransferTopic = ethers.id("Transfer(address,address,uint256)");
    const lockerTopic = ethers.zeroPadValue(lockerAddress, 32);

    console.log("Scanning WETH logs from Locker...");
    const logs = await provider.getLogs({
        address: wethAddress,
        topics: [wethTransferTopic, lockerTopic],
        fromBlock: 25000000,
        toBlock: "latest"
    });

    console.log(`Found ${logs.length} transfers from locker.`);

    for (const log of logs.slice(-10)) {
        const txHash = log.transactionHash;
        const tx = await provider.getTransaction(txHash);

        console.log("---");
        console.log("Hash:", txHash);
        console.log("To Wallet:", ethers.getAddress(ethers.dataSlice(log.topics[2], 12)));
        console.log("Method Sig:", tx.data.substring(0, 10));

        if (tx.data.toLowerCase().includes(targetToken.substring(2))) {
            console.log("MATCH: Input data contains target token!");
        } else {
            console.log("NO MATCH for token.");
        }
    }
}

main();
