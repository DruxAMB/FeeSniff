
import { ethers } from "ethers";

const tokenAddress = "0x1e59A76e58E07e988d97aa7d89Eb15dc4BF18b07";
const apiUrl = `https://base.blockscout.com/api/v2/tokens/${tokenAddress}/holders`;

async function test() {
    console.log(`Fetching from: ${apiUrl}`);
    try {
        const res = await fetch(apiUrl);
        if (!res.ok) {
            console.error(`HTTP error! status: ${res.status}`);
            return;
        }
        const data = await res.json();
        console.log("Full API Response (first 2 items):");
        console.log(JSON.stringify(data.items?.slice(0, 2), null, 2));
        
        if (data.items) {
            console.log("\nParsed Values:");
            data.items.slice(0, 5).forEach((item: any, i: number) => {
                console.log(`${i+1}. ${item.address.hash}:`);
                console.log(`   value: ${item.value}`);
                console.log(`   value_percent: ${item.value_percent}`);
                console.log(`   val_percent (guess): ${item.value_percentage}`);
            });
        }
    } catch (err) {
        console.error("Fetch failed:", err);
    }
}

test();
