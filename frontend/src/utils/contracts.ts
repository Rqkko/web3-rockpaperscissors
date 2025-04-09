import web3 from "./web3";
import RpsCoinABI from "../contracts/RpsCoin.json";

// Define the structure of the ABI JSON files
interface Network {
  [key: string]: { address: string };
}

if (!web3) {
  throw new Error("Web3 is not initialized");
}

const networkId = await Number(await web3.eth.net.getId());

const rpsCoinAddress = (RpsCoinABI.networks as Network)[networkId].address;

if (!rpsCoinAddress) {
  throw new Error("Contract addresses not found for the current network");
}

const rpsCoin = new web3.eth.Contract(RpsCoinABI.abi, rpsCoinAddress);

export { rpsCoin };