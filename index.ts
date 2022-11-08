import 'dotenv/config'
import { BigNumber, ethers } from 'ethers'
import { Router } from './types/ethers-contracts/Router'
import routerAbi from './abis/router.json'
import ERC20Abi from './abis/ERC20.json'
import { formatUnits } from 'ethers/lib/utils'
import { ERC20 } from './types/ethers-contracts'

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const TOKEN_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const AMOUNT_IN = ethers.utils.parseUnits('1', 6) //the amount of tokens you wish to swap, converted to BigNumber
const SLIPPAGE_PERCENT = 5 //the slippage value you wish to use for the transaction as a percentage e.g. 5 = 5% slippage
const DEADLINE = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes from the current Unix time

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || '')
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider)
const usdc = new ethers.Contract(USDC_ADDRESS, ERC20Abi, wallet) as ERC20
const token = new ethers.Contract(TOKEN_ADDRESS, ERC20Abi, wallet) as ERC20
const router = new ethers.Contract(
  '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
  routerAbi,
  wallet
) as Router

async function main() {
  console.log('Calculating minimum output amount...')
  const amountsOut = await router.getAmountsOut(AMOUNT_IN, [
    usdc.address,
    token.address,
  ])
  const amountOutMin = BigNumber.from(
    amountsOut[1].mul(100 - SLIPPAGE_PERCENT).div(100)
  )
  console.log(`Minimum amount out: ${formatUnits(amountOutMin)} WETH`)

  if ((await usdc.allowance(wallet.address, router.address)).lt(AMOUNT_IN)) {
    console.log('Approving SushiSwap router to spend your USDC...')
    await usdc.approve(router.address, ethers.constants.MaxUint256)
  }

  console.log(
    `Swapping ${formatUnits(AMOUNT_IN, 6)} USDC for minimum of ${formatUnits(
      amountOutMin
    )} WETH`
  )

  const tx = await router.swapExactTokensForTokens(
    AMOUNT_IN,
    amountOutMin,
    [usdc.address, token.address],
    wallet.address,
    DEADLINE
  )

  const receipt = await tx.wait()
  console.log(receipt)
  console.log(
    `Transaction complete. View your transaction on etherscan: https://etherscan.io/tx/${receipt.transactionHash}`
  )
}

main()
  .catch((err) => console.error(err))
  .then(() => process.exit(0))
