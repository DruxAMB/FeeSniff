const { ethers } = require("ethers");

async function main() {
    const rpcUrl = "https://mainnet.base.org";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const tokenAddress = "0xF35452565ABe5c1A81C8faA35169a754732b5B07";

    const abi = [
        "function allData() external view returns (tuple(address lpPool, address clanker, address token, uint24 fee, bytes32 salt, uint160 sqrtPriceX96))"
    ];

    const token = new ethers.Contract(tokenAddress, abi, provider);

    try {
        const data = await token.allData();
        console.log("allData result:");
        console.log("lpPool:", data.lpPool);
        console.log("clanker:", data.clanker);
        console.log("token:", data.token);
        console.log("fee:", data.fee);
        console.log("salt:", data.salt);
        console.log("sqrtPriceX96:", data.sqrtPriceX96);
    } catch (err) {
        console.error("Failed to decode as struct:", err.message);
        // Fallback to raw decode if named tuple fails
        const rawAbi = ["function allData() external view returns (address, address, address, uint24, bytes32, uint160)"];
        const rawToken = new ethers.Contract(tokenAddress, rawAbi, provider);
        const rawData = await rawToken.allData();
        console.log("Raw decode:", rawData);
    }
}

main();
