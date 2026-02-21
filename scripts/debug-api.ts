export {};
const ETHERSCAN_API_KEY = "8NQZA6RWBFWFBX61UBJ9NTCARW995Y9CCI";
const tokenAddress = "0x23FDa67Ed8442C058766d24AC5228f03F079bBa3";
const chainId = "8453";

async function debug() {
  const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=contract&action=getcontractcreation&contractaddresses=${tokenAddress}&apikey=${ETHERSCAN_API_KEY}`;
  
  console.log(`URL: ${url}`);
  
  const res = await fetch(url);
  const data = await res.json();
  
  console.log("Response:", JSON.stringify(data, null, 2));
}

debug();
