export {};
const tokenAddress = "0x23FDa67Ed8442C058766d24AC5228f03F079bBa3";
const blockscoutApi = "https://base.blockscout.com/api/v2";

const intermediateAddr = "0xad9793c86283b348d6cc1722f1620d3cbb8acfa1";

async function debugBlockscout() {
  const url = `${blockscoutApi}/addresses/${intermediateAddr}`;
  
  console.log(`URL: ${url}`);
  
  const res = await fetch(url);
  const data = await res.json();
  
  console.log("Full Response:", JSON.stringify(data, null, 2));
}

debugBlockscout();
