import { Provider, utils, Wallet, Web3Provider } from "zksync-web3";
import * as ethers from "ethers";
import { AtlasEnvironment } from "atlas-ide";

import MyERC20Artifact from "../artifacts/MyERC20";

function getToken(token_address: string, abi: any, wallet: Wallet) {
  return new ethers.Contract(token_address, abi, wallet);
}

export async function main (
    atlas: AtlasEnvironment,
    paymaster_address: string,
    token_address: string,
    empty_wallet_pk: string
) {
  const provider = new Web3Provider(atlas.provider);
  const connectedChainID = (await provider.getNetwork()).chainId;
  if(connectedChainID !== 280 && connectedChainID !== 324) {
      throw new Error("Must be connected to zkSync within Atlas");
  }
  const wallet = provider.getSigner();

  const emptyWallet = new Wallet(empty_wallet_pk, provider);

  // const paymasterWallet = new Wallet(PAYMASTER_ADDRESS, provider);
  // Obviously this step is not required, but it is here purely to demonstrate that indeed the wallet has no ether.
  const ethBalance = await emptyWallet.getBalance();
  if (!ethBalance.eq(0)) {
    throw new Error("The wallet is not empty!");
  }

  console.log(
    `ERC20 token balance of the empty wallet before mint: ${await emptyWallet.getBalance(
      token_address
    )}`
  );

  let paymasterBalance = await provider.getBalance(paymaster_address);
  console.log(`Paymaster ETH balance is ${paymasterBalance.toString()}`);

  const erc20 = getToken(token_address, MyERC20Artifact.MyERC20.abi, emptyWallet);

  const gasPrice = await provider.getGasPrice();
  // Encoding the "ApprovalBased" paymaster flow's input
  const paymasterParams = utils.getPaymasterParams(paymaster_address, {
    type: "ApprovalBased",
    token: token_address,
    // set minimalAllowance as we defined in the paymaster contract
    minimalAllowance: ethers.BigNumber.from(1),
    // empty bytes as testnet paymaster does not use innerInput
    innerInput: new Uint8Array(0),
  });

  // Estimate gas fee for mint transaction
  const gasLimit = await erc20.estimateGas.mint(emptyWallet.address, 5, {
    customData: {
      gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
      paymasterParams: paymasterParams,
    },
  });


  const fee = gasPrice.mul(gasLimit.toString());
  console.log("Transaction fee estimation is :>> ", fee.toString());

  console.log(`Minting 5 tokens for empty wallet via paymaster...`);
  await (
    await erc20.mint(emptyWallet.address, 5, {
      // paymaster info
      customData: {
        paymasterParams: paymasterParams,
        gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
      },
    })
  ).wait();

  console.log(
    `Paymaster ERC20 token balance is now ${await erc20.balanceOf(
      paymaster_address
    )}`
  );

  paymasterBalance = await provider.getBalance(paymaster_address);
  console.log(`Paymaster ETH balance is now ${paymasterBalance.toString()}`);

  console.log(
    `ERC20 token balance of the empty wallet after mint: ${await emptyWallet.getBalance(
      token_address
    )}`
  );
}

