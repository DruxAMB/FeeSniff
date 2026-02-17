const { ethers } = require("ethers");

async function main() {
    const rpcUrl = "https://mainnet.base.org";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const address = "0xe7E637899c608DA9c15983f9749B03A071f48091";

    const code = await provider.getCode(address);
    console.log(`Address: ${address}`);
    console.log(`Is Contract: ${code !== "0x"}`);
    if (code !== "0x") {
        console.log(`Code length: ${code.length}`);
    }
}

main();
