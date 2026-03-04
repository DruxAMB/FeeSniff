export {};
const deployerAddress = "0x2112b8456AC07c15fA31ddf3Bf713E77716fF3F9";
const blockscoutApi = "https://base.blockscout.com/api";

async function debugDeployer() {
  const url = `${blockscoutApi}?module=account&action=txlist&address=${deployerAddress}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc`;
  
  console.log(`URL: ${url}`);
  
  const res = await fetch(url);
  const data = await res.json();
  
  console.log("Response Count:", data.result.length);
  console.log("Recent Transactions:", JSON.stringify(data.result.slice(0, 5), null, 2));
}

debugDeployer();
