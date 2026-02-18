const { ethers } = require("ethers");

async function main() {
    const rpcUrl = "https://base.llamarpc.com";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const walletAddress = "0xe7E637899c608DA9c15983f9749B03A071f48091";
    const lockerAddress = "0xF3622742b1E446D92e45E22923Ef11C2fcD55D68";
    const targetToken = "0xF35452565ABe5c1A81C8faA35169a754732b5B07".toLowerCase();

    // Instead of getLogs, I'll fetch the recent txs from the Blockscout API manually to get the hashes
    const url = `https://base.blockscout.com/api/v2/addresses/${walletAddress}/token-transfers?type=ERC-20&filter=to&token=0x4200000000000000000000000000000000000006`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        const transfers = data.items.filter(item => item.from.hash.toLowerCase() === lockerAddress.toLowerCase());

        console.log(`Found ${transfers.length} transfers from Locker.`);

        for (const tx of transfers) {
            const txData = await provider.getTransaction(tx.transaction_hash);
            const input = txData.data.toLowerCase();
            const match = input.includes(targetToken.substring(2));
            console.log(`Hash: ${tx.transaction_hash}`);
            console.log(`  Input: ${input.slice(0, 64)}...`);
            console.log(`  Match Token: ${match}`);
        }
    } catch (err) {
        console.error(err);
    }
}

main();
