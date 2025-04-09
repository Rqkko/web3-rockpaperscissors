import Web3 from "web3";

// Extend the Window interface to include the ethereum property
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string }) => Promise<unknown>;
    };
  }
}

let web3: Web3 | undefined;

if (window.ethereum) {
  web3 = new Web3(window.ethereum);
} else {
  alert("Please install MetaMask");
}

export default web3;