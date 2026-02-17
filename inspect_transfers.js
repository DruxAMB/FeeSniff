const { ethers } = require("ethers");

async function main() {
    const rpcUrl = "https://base.llamarpc.com";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const walletAddress = "0xe7E637899c608DA9c15983f9749B03A071f48091";
    const lockerAddress = "0xF3622742b1E446D92e45E22923Ef11C2fcD55D68";
    const wethAddress = "0x4200000000000000000000000000000000000006";

    console.log("Current block:", await provider.getBlockNumber());

    // Search for WETH Transfer(Locker, Wallet, ...)
    const transferEventTopic = ethers.id("Transfer(address,address,uint256)");
    const lockerTopic = ethers.zeroPadValue(lockerAddress, 32);
    const walletTopic = ethers.zeroPadValue(walletAddress, 32);

    console.log("Searching for WETH transfers from Locker to Wallet...");
    const logs = await provider.getLogs({
        address: wethAddress,
        topics: [transferEventTopic, lockerTopic, walletTopic],
        fromBlock: 24000000,
        toBlock: "latest"
    });

    console.log(`Found ${logs.length} transfers.`);

    for (const log of logs.slice(-5)) {
        const txHash = log.transactionHash;
        const tx = await provider.getTransaction(txHash);

        console.log("---");
        console.log("Hash:", txHash);
        console.log("Method Sig:", tx.data.substring(0, 10));

        const targetToken = "0xF35452565ABe5c1A81C8faA35169a754732b5B07".toLowerCase().substring(2);
        if (tx.data.toLowerCase().includes(targetToken)) {
            console.log("MATCH: This transaction input contains the target token address!");
        } else {
            console.log("NO MATCH: Targeting a different token.");
        }
    }
}

main();
