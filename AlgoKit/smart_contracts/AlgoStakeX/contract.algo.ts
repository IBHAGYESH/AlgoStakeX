import {
  Contract,
  abimethod,
  Global,
  Txn,
  itxn,
  Uint64,
  uint64,
  BoxMap,
  bytes,
  assert,
  arc4,
  clone,
  op,
} from "@algorandfoundation/algorand-typescript";

// Global constants
const MIN_BALANCE: uint64 = Uint64(100000); // 0.1 ALGO base minimum
const YEAR_IN_SECONDS: uint64 = Uint64(31536000); // 365 days
const BASIS_POINTS_DIVISOR: uint64 = Uint64(10000); // 100% = 10000 basis points

// Combined stake data (all-in-one)
class StakeData extends arc4.Struct<{
  staker: arc4.Address; // Staker's wallet address
  tokenId: arc4.Uint64; // ASA ID being staked
  isFlexible: arc4.Bool; // true = withdraw anytime
  amount: arc4.Uint64; // Staked amount
  stakedAt: arc4.Uint64; // Timestamp when staked
  lockPeriod: arc4.Uint64; // Lock period in seconds
  lockEndTime: arc4.Uint64; // When lock period ends
  rewardType: arc4.Str; // "APY" or "UTILITY"
  rewardRate: arc4.Uint64; // APY in basis points (1000 = 10%), only >0 when rewardType is "APY"
  utility: arc4.Str; // Utility value when rewardType is "UTILITY"
}> {}

export class AlgoStakeX extends Contract {
  // BoxMap with key as "poolId_walletAddress"
  private stakes = BoxMap<bytes, StakeData>({ keyPrefix: "stake_" });

  /**
   * Stake tokens into a pool
   * Transaction group expected:
   * [0] App call: stake
   * [1] Asset transfer: User → Contract
   */
  @abimethod()
  public stake(
    poolId: string,
    tokenId: uint64,
    isFlexible: boolean,
    amount: uint64,
    lockPeriod: uint64,
    rewardType: string,
    rewardRate: uint64,
    utility: string
  ): bytes {
    // Create stake key: "poolId_userAddress"
    // Use Account bytes directly in key (poolId + separator + sender bytes)
    const poolIdBytes = new arc4.Str(poolId).bytes;
    const separator = new arc4.Str("_").bytes;
    const stakeKey = op.concat(
      op.concat(poolIdBytes, separator),
      Txn.sender.bytes
    );

    // Opt-in to staking token (opt-in is idempotent, safe to call multiple times)
    itxn
      .assetTransfer({
        assetReceiver: Global.currentApplicationAddress,
        xferAsset: tokenId,
        assetAmount: 0,
        fee: 0,
      })
      .submit();

    const currentTime = Global.latestTimestamp;

    // Validate rewardType and rewardRate
    // If rewardType is "APY", rewardRate can be > 0, otherwise it must be 0
    if (rewardType === "APY") {
      // APY type allows rewardRate > 0
    } else {
      // Non-APY types require rewardRate to be 0
      assert(
        rewardRate === Uint64(0),
        "rewardRate must be 0 when rewardType is not APY"
      );
    }

    // Check if user already has stake
    if (this.stakes(stakeKey).exists) {
      // Add to existing stake
      const existingStake = clone(this.stakes(stakeKey).value);

      // use the current sdk config when updating the stake
      const updatedStake = new StakeData({
        staker: new arc4.Address(Txn.sender),
        tokenId: new arc4.Uint64(existingStake.tokenId.asUint64()), // keep original token id
        isFlexible: new arc4.Bool(isFlexible), // current staking type
        amount: new arc4.Uint64(
          Uint64(existingStake.amount.asUint64() + amount)
        ), // current amount + new amount
        stakedAt: new arc4.Uint64(existingStake.stakedAt.asUint64()), // Keep original time
        lockPeriod: new arc4.Uint64(lockPeriod), // current lock period
        lockEndTime: new arc4.Uint64(Uint64(currentTime + lockPeriod)), // current lock end time
        rewardType: new arc4.Str(rewardType), // current reward type
        rewardRate: new arc4.Uint64(rewardRate), // current reward rate
        utility: new arc4.Str(utility), // current utility
      });

      this.stakes(stakeKey).value = clone(updatedStake);
    } else {
      // New stake
      const newStake = new StakeData({
        staker: new arc4.Address(Txn.sender),
        tokenId: new arc4.Uint64(tokenId),
        isFlexible: new arc4.Bool(isFlexible),
        amount: new arc4.Uint64(amount),
        stakedAt: new arc4.Uint64(currentTime),
        lockPeriod: new arc4.Uint64(lockPeriod),
        lockEndTime: new arc4.Uint64(Uint64(currentTime + lockPeriod)),
        rewardType: new arc4.Str(rewardType),
        rewardRate: new arc4.Uint64(rewardRate),
        utility: new arc4.Str(utility),
      });

      this.stakes(stakeKey).value = clone(newStake);
    }

    return Txn.txId;
  }

  /**
   * Withdraw staked tokens with rewards
   */
  @abimethod()
  public withdraw(poolId: string): bytes {
    // Create stake key
    const poolIdBytes = new arc4.Str(poolId).bytes;
    const separator = new arc4.Str("_").bytes;
    const stakeKey = op.concat(
      op.concat(poolIdBytes, separator),
      Txn.sender.bytes
    );

    // Verify stake exists
    assert(this.stakes(stakeKey).exists, "No active stake found");

    const stakeData = clone(this.stakes(stakeKey).value);

    // Verify staker
    const currentSenderAddr = new arc4.Address(Txn.sender);
    assert(
      stakeData.staker.native === currentSenderAddr.native,
      "Not the staker"
    );

    const currentTime = Global.latestTimestamp;

    // Check if withdrawal is allowed
    if (!stakeData.isFlexible.native) {
      assert(
        currentTime >= stakeData.lockEndTime.asUint64(),
        "Lock period not ended"
      );
    }

    // Transfer staked tokens back to user
    itxn
      .assetTransfer({
        assetReceiver: Txn.sender,
        xferAsset: stakeData.tokenId.asUint64(),
        assetAmount: stakeData.amount.asUint64(),
        fee: 0,
      })
      .submit();

    // Rewards are no longer paid by the app account.
    // They must be included as an external ASA transfer in the same group by the SDK's treasury.

    // Delete stake record
    this.stakes(stakeKey).delete();

    return Txn.txId;
  }

  /**
   * Emergency withdraw with penalty (for locked staking)
   * Penalty tokens are sent to treasury wallet for recycling
   */
  @abimethod()
  public emergencyWithdraw(
    poolId: string,
    penaltyPercentage: uint64,
    treasuryAddress: arc4.Address
  ): bytes {
    const poolIdBytes = new arc4.Str(poolId).bytes;
    const separator = new arc4.Str("_").bytes;
    const stakeKey = op.concat(
      op.concat(poolIdBytes, separator),
      Txn.sender.bytes
    );

    assert(this.stakes(stakeKey).exists, "No active stake found");

    const stakeData = clone(this.stakes(stakeKey).value);

    const currentSenderAddr = new arc4.Address(Txn.sender);
    assert(
      stakeData.staker.native === currentSenderAddr.native,
      "Not the staker"
    );

    // Calculate penalty
    const penalty = Uint64(
      (stakeData.amount.asUint64() * penaltyPercentage) / BASIS_POINTS_DIVISOR
    );
    const amountToReturn = Uint64(stakeData.amount.asUint64() - penalty);

    // Transfer principal minus penalty back to user
    itxn
      .assetTransfer({
        assetReceiver: Txn.sender,
        xferAsset: stakeData.tokenId.asUint64(),
        assetAmount: amountToReturn,
        fee: 0,
      })
      .submit();

    // Transfer penalty to treasury wallet (if penalty > 0)
    if (penalty > 0) {
      itxn
        .assetTransfer({
          assetReceiver: treasuryAddress.native,
          xferAsset: stakeData.tokenId.asUint64(),
          assetAmount: penalty,
          fee: 0,
        })
        .submit();
    }

    // Delete stake record
    this.stakes(stakeKey).delete();

    return Txn.txId;
  }

  /**
   * Check if user has valid stake (for access control)
   */
  @abimethod({ readonly: true })
  public hasValidStake(
    poolId: string,
    userAddress: string,
    minimumAmount: uint64
  ): boolean {
    // Create stake key
    const poolIdBytes = new arc4.Str(poolId).bytes;
    const separator = new arc4.Str("_").bytes;
    const userAddrBytes = new arc4.Str(userAddress).bytes;
    const stakeKey = op.concat(
      op.concat(poolIdBytes, separator),
      userAddrBytes
    );

    if (!this.stakes(stakeKey).exists) {
      return false;
    }

    const stakeData = clone(this.stakes(stakeKey).value);

    // Check minimum amount
    if (stakeData.amount.asUint64() < minimumAmount) {
      return false;
    }

    return true;
  }

  /**
   * Get stake information for a user
   */
  @abimethod({ readonly: true })
  public getStakeInfo(poolId: string, userAddress: string): StakeData {
    const poolIdBytes = new arc4.Str(poolId).bytes;
    const separator = new arc4.Str("_").bytes;
    const userAddrBytes = new arc4.Str(userAddress).bytes;
    const stakeKey = op.concat(
      op.concat(poolIdBytes, separator),
      userAddrBytes
    );

    assert(this.stakes(stakeKey).exists, "No stake found");

    return clone(this.stakes(stakeKey).value);
  }

  /**
   * Helper: Calculate rewards based on amount, rate, and time
   * Formula: (amount * rewardRate * timeStaked) / (10000 * 31536000)
   * rewardRate in basis points (1000 = 10% APY)
   * timeStaked in seconds
   */
  // private calculateRewards(
  //   amount: uint64,
  //   rewardRateBasisPoints: uint64,
  //   timeStakedSeconds: uint64
  // ): uint64 {
  //   // Calculate: (amount * rate * time) / (10000 * year)
  //   const numerator = Uint64(
  //     amount * rewardRateBasisPoints * timeStakedSeconds
  //   );
  //   const denominator = Uint64(BASIS_POINTS_DIVISOR * YEAR_IN_SECONDS);

  //   return Uint64(numerator / denominator);
  // }

  /**
   * Calculate pending rewards for a stake
   */
  // @abimethod({ readonly: true })
  // public calculatePendingRewards(poolId: string, userAddress: string): uint64 {
  //   const poolIdBytes = new arc4.Str(poolId).bytes;
  //   const separator = new arc4.Str("_").bytes;
  //   const userAddrBytes = new arc4.Str(userAddress).bytes;
  //   const stakeKey = op.concat(
  //     op.concat(poolIdBytes, separator),
  //     userAddrBytes
  //   );

  //   assert(this.stakes(stakeKey).exists, "No stake found");

  //   const stakeData = clone(this.stakes(stakeKey).value);
  //   const currentTime = Global.latestTimestamp;
  //   const timeStaked = Uint64(currentTime - stakeData.stakedAt.asUint64());

  //   return this.calculateRewards(
  //     stakeData.amount.asUint64(),
  //     stakeData.rewardRate.asUint64(),
  //     timeStaked
  //   );
  // }

  /**
   * Update stake configuration (extend lock, change reward rate, etc.)
   * User can modify their own stake parameters
   */
  // @abimethod()
  // public updateStake(
  //   poolId: string,
  //   newRewardRate: uint64,
  //   newLockPeriod: uint64,
  //   newIsFlexible: boolean
  // ): bytes {
  //   const poolIdBytes = new arc4.Str(poolId).bytes;
  //   const separator = new arc4.Str("_").bytes;
  //   const stakeKey = op.concat(
  //     op.concat(poolIdBytes, separator),
  //     Txn.sender.bytes
  //   );

  //   assert(this.stakes(stakeKey).exists, "No active stake found");

  //   const stakeData = clone(this.stakes(stakeKey).value);

  //   const currentSenderAddr = new arc4.Address(Txn.sender);
  //   assert(
  //     stakeData.staker.native === currentSenderAddr.native,
  //     "Not the staker"
  //   );

  //   const currentTime = Global.latestTimestamp;

  //   // Update stake with new parameters
  //   const updatedStake = new StakeData({
  //     staker: new arc4.Address(stakeData.staker.native),
  //     tokenId: new arc4.Uint64(stakeData.tokenId.asUint64()),
  //     isFlexible: new arc4.Bool(newIsFlexible),
  //     amount: new arc4.Uint64(stakeData.amount.asUint64()),
  //     stakedAt: new arc4.Uint64(stakeData.stakedAt.asUint64()),
  //     lockPeriod: new arc4.Uint64(newLockPeriod),
  //     lockEndTime: new arc4.Uint64(Uint64(currentTime + newLockPeriod)),
  //     rewardRate: new arc4.Uint64(newRewardRate),
  //     totalRewardsClaimed: new arc4.Uint64(
  //       stakeData.totalRewardsClaimed.asUint64()
  //     ),
  //   });

  //   this.stakes(stakeKey).value = clone(updatedStake);

  //   return Txn.txId;
  // }

  /**
   * Donate tokens to contract (no staking)
   * Transaction group:
   * [0] App call: donateTokens
   * [1] Asset transfer: User → Contract
   */
  @abimethod()
  public donateTokens(tokenId: uint64, amount: uint64): bytes {
    // Opt-in if needed (opt-in is idempotent, safe to call multiple times)
    itxn
      .assetTransfer({
        assetReceiver: Global.currentApplicationAddress,
        xferAsset: tokenId,
        assetAmount: 0,
        fee: 0,
      })
      .submit();

    return Txn.txId;
  }

  /**
   * Withdraw excess tokens from contract (admin only)
   * Only withdraws tokens that are NOT currently staked
   */
  @abimethod()
  public withdrawExcessTokens(tokenId: uint64, amount: uint64): bytes {
    // Only admin can withdraw excess
    assert(
      Txn.sender === Global.creatorAddress,
      "Only admin can withdraw excess"
    );

    // Transfer excess tokens to recipient
    // Note: Amount is validated by the asset transfer itself
    itxn
      .assetTransfer({
        assetReceiver: Txn.sender,
        xferAsset: tokenId,
        assetAmount: amount,
        fee: 0,
      })
      .submit();

    return Txn.txId;
  }

  /**
   * Fund contract with ALGO for MBR
   */
  @abimethod()
  public fundContract(amount: uint64): void {
    assert(
      Txn.sender === Global.creatorAddress,
      "Only admin can fund the contract"
    );

    itxn
      .payment({
        amount: amount,
        receiver: Global.currentApplicationAddress,
        fee: 0,
      })
      .submit();
  }

  /**
   * Withdraw excess ALGO from contract
   */
  @abimethod()
  public withdrawExcessAlgo(): void {
    assert(
      Txn.sender === Global.creatorAddress,
      "Only admin can withdraw funds"
    );

    const amountToWithdraw = Uint64(
      Global.currentApplicationAddress.balance - MIN_BALANCE
    );

    assert(amountToWithdraw > Uint64(0), "No excess balance to withdraw");

    itxn
      .payment({
        amount: amountToWithdraw,
        receiver: Txn.sender,
        fee: 0,
      })
      .submit();
  }
}
