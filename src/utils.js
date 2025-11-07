/**
 * AlgoStakeX SDK Utility Functions
 * Pure utility functions for conversions, encoding, and data transformation
 */

import algosdk from "algosdk";

/**
 * Conversion Utilities
 */

export function algosToMicroAlgos(algos) {
  return Math.round(algos * 1000000);
}

export function microAlgosToAlgos(microAlgos) {
  return microAlgos / 1000000;
}

/**
 * ARC-4 Encoding Utilities for Box Storage
 */

export function getStakeKey(poolId, userAddress) {
  // Create stake key to match smart contract's ARC-4 encoding
  // Smart contract uses: BoxMap keyPrefix "stake_" + arc4.Str(poolId).bytes + arc4.Str("_").bytes + Txn.sender.bytes
  // ARC-4 string encoding: 2-byte length prefix (big-endian) + UTF-8 bytes

  const poolIdBytes = new TextEncoder().encode(poolId);
  const separatorBytes = new TextEncoder().encode("_");
  const userAddressBytes = algosdk.decodeAddress(userAddress).publicKey;

  // Calculate total size: poolId (2 + length) + separator (2 + 1) + address (32)
  const totalSize =
    2 +
    poolIdBytes.length +
    2 +
    separatorBytes.length +
    userAddressBytes.length;
  const stakeKey = new Uint8Array(totalSize);

  let offset = 0;

  // Encode poolId with ARC-4 format (2-byte big-endian length + bytes)
  const poolIdView = new DataView(stakeKey.buffer);
  poolIdView.setUint16(offset, poolIdBytes.length, false); // big-endian
  offset += 2;
  stakeKey.set(poolIdBytes, offset);
  offset += poolIdBytes.length;

  // Encode separator with ARC-4 format (2-byte big-endian length + bytes)
  poolIdView.setUint16(offset, separatorBytes.length, false); // big-endian
  offset += 2;
  stakeKey.set(separatorBytes, offset);
  offset += separatorBytes.length;

  // Add user address bytes (no length prefix for raw bytes)
  stakeKey.set(userAddressBytes, offset);

  return stakeKey;
}

export function buildStakeBoxName(poolId, userAddress) {
  // Build full box name to match smart contract's BoxMap with keyPrefix "stake_"
  // Full name = "stake_" + arc4.Str(poolId).bytes + arc4.Str("_").bytes + userAddress
  // ARC-4 string encoding: 2-byte length prefix (big-endian) + UTF-8 bytes

  const prefix = new TextEncoder().encode("stake_");
  const poolIdBytes = new TextEncoder().encode(poolId);
  const separatorBytes = new TextEncoder().encode("_");
  const userAddressBytes = algosdk.decodeAddress(userAddress).publicKey;

  // Total size: prefix + (2 + poolId) + (2 + separator) + address
  const totalSize =
    prefix.length +
    2 +
    poolIdBytes.length +
    2 +
    separatorBytes.length +
    userAddressBytes.length;
  const name = new Uint8Array(totalSize);

  let offset = 0;

  // Add "stake_" prefix
  name.set(prefix, offset);
  offset += prefix.length;

  // Encode poolId with ARC-4 format (2-byte big-endian length + bytes)
  const view = new DataView(name.buffer);
  view.setUint16(offset, poolIdBytes.length, false); // big-endian
  offset += 2;
  name.set(poolIdBytes, offset);
  offset += poolIdBytes.length;

  // Encode separator with ARC-4 format (2-byte big-endian length + bytes)
  view.setUint16(offset, separatorBytes.length, false); // big-endian
  offset += 2;
  name.set(separatorBytes, offset);
  offset += separatorBytes.length;

  // Add user address bytes (no length prefix for raw bytes)
  name.set(userAddressBytes, offset);

  return name;
}

/**
 * Data Decoding Utilities
 */

export function decodeStakeData(boxValueBytes) {
  // Decode ARC-4 encoded StakeData struct from box value
  // The box contains ARC-4 encoded data
  try {
    const view = new DataView(boxValueBytes.buffer);
    let offset = 0;

    // ARC-4 encoding for structs includes a type prefix (2 bytes)
    // Skip type prefix (2 bytes for struct type ID)
    offset += 2;

    // Decode staker (arc4.Address = 32 bytes)
    const stakerBytes = boxValueBytes.slice(offset, offset + 32);
    const staker = algosdk.encodeAddress(stakerBytes);
    offset += 32;

    // Decode tokenId (arc4.Uint64 = 8 bytes)
    const tokenId = view.getBigUint64(offset, false);
    offset += 8;

    // Decode isFlexible (arc4.Bool = 1 byte)
    const isFlexible = boxValueBytes[offset] !== 0;
    offset += 1;

    // Decode amount (arc4.Uint64 = 8 bytes)
    const amount = view.getBigUint64(offset, false);
    offset += 8;

    // Decode stakedAt (arc4.Uint64 = 8 bytes)
    const stakedAt = view.getBigUint64(offset, false);
    offset += 8;

    // Decode lockPeriod (arc4.Uint64 = 8 bytes)
    const lockPeriod = view.getBigUint64(offset, false);
    offset += 8;

    // Decode lockEndTime (arc4.Uint64 = 8 bytes)
    const lockEndTime = view.getBigUint64(offset, false);
    offset += 8;

    // Decode rewardType (arc4.Str = length (2 bytes) + string bytes)
    const rewardTypeLength = view.getUint16(offset, false);
    offset += 2;
    const rewardTypeBytes = boxValueBytes.slice(
      offset,
      offset + rewardTypeLength
    );
    const rewardType = new TextDecoder().decode(rewardTypeBytes);
    offset += rewardTypeLength;

    // Decode rewardRate (arc4.Uint64 = 8 bytes)
    const rewardRate = view.getBigUint64(offset, false);
    offset += 8;

    // Decode utility (arc4.Str = length (2 bytes) + string bytes)
    const utilityLength = view.getUint16(offset, false);
    offset += 2;
    const utilityBytes = boxValueBytes.slice(offset, offset + utilityLength);
    const utility = new TextDecoder().decode(utilityBytes);
    offset += utilityLength;

    // Decode totalRewardsClaimed (arc4.Uint64 = 8 bytes)
    const totalRewardsClaimed = view.getBigUint64(offset, false);
    offset += 8;

    return {
      staker: staker,
      tokenId: Number(tokenId),
      isFlexible: isFlexible,
      amount: Number(amount),
      stakedAt: Number(stakedAt),
      lockPeriod: Number(lockPeriod),
      lockEndTime: Number(lockEndTime),
      rewardType: rewardType,
      rewardRate: Number(rewardRate),
      utility: utility,
      totalRewardsClaimed: Number(totalRewardsClaimed),
    };
  } catch (error) {
    console.error("Error decoding stake data:", error);
    throw error;
  }
}
