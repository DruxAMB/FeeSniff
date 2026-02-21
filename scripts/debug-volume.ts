import { fetchTotalVolume } from "../lib/analyzer";
import { CHAINS } from "../lib/chains";

async function debugVolume() {
    const chain = CHAINS.find(c => c.id === "base")!;
    const DAY3 = "0xc87f8a3a33159af49b4927d006cbf95ebbdceb07";
    
    console.log(`\n🔍 Fetching TOTAL LIFETIME volume for DAY3...`);
    console.time("Volume");
    
    const result = await fetchTotalVolume(DAY3, chain);
    
    console.timeEnd("Volume");
    console.log(`📈 Total Volume: ${result.volumeEth} ETH`);
}

debugVolume().catch(console.error);
