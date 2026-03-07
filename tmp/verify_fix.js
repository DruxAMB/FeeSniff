
const tokenAddress = "0x1e59A76e58E07e988d97aa7d89Eb15dc4BF18b07";
const apiUrl = `https://base.blockscout.com/api/v2/tokens/${tokenAddress}/holders`;
const totalSupplyRaw = "100000000000000000000000000000"; // Previously verified raw supply

async function verify() {
    console.log(`Verifying holder calculation for: ${tokenAddress}`);
    try {
        const res = await fetch(apiUrl);
        const data = await res.json();
        const supply = BigInt(totalSupplyRaw);

        console.log("\nResults after fix logic:");
        data.items.slice(0, 5).forEach((item, i) => {
            const rawValue = BigInt(item.value || "0");
            // Mimic the logic added to analyzer.ts:
            let percent = parseFloat(item.value_percent);
            if ((isNaN(percent) || percent === 0) && supply > 0n) {
                percent = Number((rawValue * 10000n) / supply) / 100;
            }

            console.log(`${i + 1}. ${item.address.hash}:`);
            console.log(`   Raw Value: ${item.value}`);
            console.log(`   Calculated Percent: ${percent.toFixed(2)}%`);
        });
    } catch (err) {
        console.error("Verification failed:", err);
    }
}

verify();
