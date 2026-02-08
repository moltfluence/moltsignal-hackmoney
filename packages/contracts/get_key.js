const { Wallet } = require("ethers");

// Your 12 words (Don't share this file!)
const mnemonic = "valid elbow holiday oak pioneer truck shallow tiger plate monkey virtual aspect";

// Create wallet from words
const wallet = Wallet.fromPhrase(mnemonic);

console.log("YOUR PRIVATE KEY IS:");
console.log(wallet.privateKey);