const { ethers } = require("ethers");

async function main() {
    const rpcUrl = "https://base.llamarpc.com";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const tokenAddress = "0xF35452565ABe5c1A81C8faA35169a754732b5B07";
    const wethAddress = "0x4200000000000000000000000000000000000006";
    const uniV3FactoryAddr = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";

    // 1. Check Uniswap V3
    const factoryAbi = ["function getPool(address,address,uint24) view returns (address)"];
    const factory = new ethers.Contract(uniV3FactoryAddr, factoryAbi, provider);
    const tiers = [100, 500, 3000, 10000];

    console.log("Checking Uniswap V3 Pools...");
    for (const tier of tiers) {
        const pool = await factory.getPool(tokenAddress, wethAddress, tier);
        if (pool !== ethers.ZeroAddress) {
            console.log(`Found Uniswap V3 Pool (${tier}): ${pool}`);
        }
    }

    // 2. Check Aerodrome
    const aeroFactoryAddr = "0x4200000000000000000000000000000000000010"; // Base Factory (V2 style)
    const aeroAbi = ["function getPool(address,address,bool) view returns (address)"];
    const aero = new ethers.Contract(aeroFactoryAddr, aeroAbi, provider);

    console.log("Checking Aerodrome Pools...");
    try {
        const p1 = await aero.getPool(tokenAddress, wethAddress, true);
        if (p1 !== ethers.ZeroAddress) console.log(`Found Aerodrome Stable Pool: ${p1}`);
        const p2 = await aero.getPool(tokenAddress, wethAddress, false);
        if (p2 !== ethers.ZeroAddress) console.log(`Found Aerodrome Volatile Pool: ${p2}`);
    } catch { }

    // 3. Check Clanker V4 PoolManager discovery
    // Clanker V4 uses PoolManager. 
}

main();
