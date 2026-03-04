export {};
const tokenAddress = "0x23FDa67Ed8442C058766d24AC5228f03F079bBa3";
const blockscoutApi = "https://base.blockscout.com/api/v2";

async function debugAbi() {
  const url = `${blockscoutApi}/smart-contracts/${tokenAddress}`;
  const res = await fetch(url);
  const data = await res.json();
  
  if (!data.abi) {
    console.log("No ABI found!");
    return;
  }

  const abi = typeof data.abi === "string" ? JSON.parse(data.abi) : data.abi;
  if (!abi || !Array.isArray(abi)) {
    console.log("Invalid ABI format:", typeof data.abi);
    return;
  }
  console.log(`Total items in ABI: ${abi.length}`);
  
  const functionNames = abi
    .filter((item: any) => item.type === "function")
    .map((item: any) => item.name);
    
  console.log("Function names:", functionNames.join(", "));
  
  const matches = ["purePool", "bond_curve_pool", "clanker", "allData", "wowData"].filter(name => 
    functionNames.includes(name)
  );
  
  console.log("Detected key functions:", matches);
}

debugAbi();
