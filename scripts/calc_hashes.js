const { ethers } = require("ethers");

async function main() {
    // Clanker Locker events
    const sigs = [
        "ClaimTokens(address,address,uint256)",
        "StoreTokens(address,address,address,uint256,uint256)",
        "AddDepositor(address)"
    ];

    for (const sig of sigs) {
        console.log(`${sig}: ${ethers.id(sig)}`);
    }
}

main();
