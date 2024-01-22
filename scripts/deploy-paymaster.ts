import * as ethers from "ethers";
import { Web3Provider, Wallet, utils, ContractFactory } from 'zksync-web3';
import { AtlasEnvironment } from "atlas-ide";

import MyPaymasterArtifact from "../artifacts/MyPaymaster";
import MyERC20Artifact from "../artifacts/MyERC20";

export async function main(atlas: AtlasEnvironment) {
  const provider = new Web3Provider(atlas.provider);
  const connectedChainID = (await provider.getNetwork()).chainId;
  if(connectedChainID !== 300 && connectedChainID !== 324) {
      throw new Error("Must be connected to zkSync within Atlas");
  }
  const wallet = provider.getSigner();


  // The wallet that will receive ERC20 tokens
  const emptyWallet = Wallet.createRandom();
  console.log(`Empty wallet's address: ${emptyWallet.address}`);
  console.log(`Empty wallet's private key: ${emptyWallet.privateKey}`);

  const erc20Factory = new ContractFactory(
      MyERC20Artifact.MyERC20.abi,
      MyERC20Artifact.MyERC20.evm.bytecode.object,
      wallet,
      "create"
  );

  const erc20 = await erc20Factory.deploy(
    "MyToken",
    "MyToken",
    18,
  );
  console.log("ERC20 deploying...");
  await erc20.deployed();
  console.log(`ERC20 address: ${erc20.address}`);


  // Deploying the paymaster
  const paymasterFactory = new ContractFactory(
      MyPaymasterArtifact.MyPaymaster.abi,
      MyPaymasterArtifact.MyPaymaster.evm.bytecode.object,
      wallet,
      "create"
  );
  
  const paymaster = await paymasterFactory.deploy(erc20.address);
  await paymaster.deployed();
  
  console.log(`Paymaster address: ${paymaster.address}`);

  console.log("Funding paymaster with ETH");
  // Supplying paymaster with ETH
  await (
    await wallet.sendTransaction({
      to: paymaster.address,
      value: ethers.utils.parseEther("0.06"),
    })
  ).wait();

  let paymasterBalance = await provider.getBalance(paymaster.address);

  console.log(`Paymaster ETH balance is now ${paymasterBalance.toString()}`);

  // Supplying the ERC20 tokens to the empty wallet:
  await // We will give the empty wallet 3 units of the token:
  (await erc20.mint(emptyWallet.address, 3)).wait();

  console.log("Minted 3 tokens for the empty wallet");

  console.log(`Done!`);
  return {
    privateKey: emptyWallet.privateKey,
    erc20Address: erc20.address,
    paymasterAddress: paymaster.address
  }
}

