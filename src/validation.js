/**
 * AlgoStakeX SDK Validation Utilities
 * Contains all validation methods for SDK parameters
 */

export class Validator {
  /**
   * Base validation methods
   */

  static validateRequired(value, paramName) {
    if (value === undefined || value === null) {
      throw new Error(`${paramName} is required`);
    }
    return value;
  }

  static validateString(value, paramName) {
    Validator.validateRequired(value, paramName);
    if (typeof value !== "string") {
      throw new Error(`${paramName} must be a string`);
    }
    if (value.trim().length === 0) {
      throw new Error(`${paramName} cannot be empty`);
    }
    return value;
  }

  static validateEnum(value, paramName, validValues) {
    Validator.validateString(value, paramName);
    if (!validValues.includes(value)) {
      throw new Error(`${paramName} must be one of: ${validValues.join(", ")}`);
    }
    return value;
  }

  static validateNumber(value, paramName, options = {}) {
    if (value === undefined || value === null) {
      return options.default ?? 0;
    }
    if (typeof value !== "number") {
      throw new Error(`${paramName} must be a number`);
    }
    if (!Number.isFinite(value)) {
      throw new Error(`${paramName} must be a finite number`);
    }
    if (options.min !== undefined && value < options.min) {
      throw new Error(
        `${paramName} must be greater than or equal to ${options.min}`
      );
    }
    if (options.max !== undefined && value > options.max) {
      throw new Error(
        `${paramName} must be less than or equal to ${options.max}`
      );
    }
    return value;
  }

  static validateBoolean(value, paramName, defaultValue = false) {
    if (value === undefined || value === null) {
      return defaultValue;
    }
    if (typeof value !== "boolean") {
      throw new Error(`${paramName} must be a boolean`);
    }
    return value;
  }

  static validateUrl(value, paramName) {
    Validator.validateString(value, paramName);
    try {
      new URL(value);
      return value;
    } catch (e) {
      throw new Error(`${paramName} must be a valid URL`);
    }
  }

  /**
   * SDK-specific validation methods
   */

  static validateEnvironment(env) {
    return Validator.validateEnum(env, "Environment", ["testnet", "mainnet"]);
  }

  static validateNamespace(namespace) {
    const validatedNamespace = Validator.validateString(namespace, "Namespace");
    if (validatedNamespace.length < 3 || validatedNamespace.length > 20) {
      throw new Error("Namespace must be between 3 and 20 characters long");
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(validatedNamespace)) {
      throw new Error(
        "Namespace must contain only alphanumeric characters, hyphens, and underscores"
      );
    }
    return validatedNamespace;
  }

  static validateTokenId(tokenId) {
    const validatedId = Validator.validateNumber(tokenId, "Token ID", {
      min: 0,
    });
    return BigInt(validatedId);
  }

  static validateStakingConfig(staking) {
    if (!staking || typeof staking !== "object") {
      throw new Error("staking configuration is required");
    }

    const type = Validator.validateEnum(staking.type, "Staking type", [
      "FLEXIBLE",
      "FIXED",
    ]);

    const config = {
      type,
      stake_period: undefined,
      withdraw_penalty: undefined,
      reward: {
        type: undefined,
        value: undefined,
      },
    };

    // Validate stake_period (optional for FLEXIBLE)
    if (staking.stake_period !== undefined) {
      config.stake_period = Validator.validateNumber(
        staking.stake_period,
        "Stake period",
        { min: 0 }
      );
    }

    // Validate withdraw_penalty (optional for FLEXIBLE)
    if (staking.withdraw_penalty !== undefined) {
      config.withdraw_penalty = Validator.validateNumber(
        staking.withdraw_penalty,
        "Withdraw penalty",
        { min: 0, max: 100 }
      );
    }

    // Validate reward configuration
    if (!staking.reward || typeof staking.reward !== "object") {
      throw new Error("Reward configuration is required");
    }

    config.reward.type = Validator.validateEnum(
      staking.reward.type,
      "Reward type",
      ["APY", "UTILITY"]
    );

    // Validate reward.value: can be a primitive or an array of tiers
    if (staking.reward.value !== undefined) {
      if (Array.isArray(staking.reward.value)) {
        config.reward.value = staking.reward.value.map((tier, index) => {
          if (!tier || typeof tier !== "object") {
            throw new Error(`Tier ${index}: must be an object`);
          }
          if (!tier.name || typeof tier.name !== "string") {
            throw new Error(
              `Tier ${index}: name is required and must be a string`
            );
          }
          const stakeAmount = Validator.validateNumber(
            tier.stake_amount,
            `Tier ${index}: stake_amount`,
            { min: 0 }
          );
          if (config.reward.type === "APY") {
            const valueNum = Validator.validateNumber(
              tier.value,
              `Tier ${index}: value (APY)`,
              { min: 0 }
            );
            return {
              name: tier.name,
              stake_amount: stakeAmount,
              value: valueNum,
            };
          } else {
            const valueStr = Validator.validateString(
              tier.value,
              `Tier ${index}: value (Utility)`
            );
            return {
              name: tier.name,
              stake_amount: stakeAmount,
              value: valueStr,
            };
          }
        });
      } else {
        if (config.reward.type === "APY") {
          config.reward.value = Validator.validateNumber(
            staking.reward.value,
            "Reward value (APY)",
            { min: 0 }
          );
        } else {
          config.reward.value = Validator.validateString(
            staking.reward.value,
            "Reward value (Utility)"
          );
        }
      }
    }

    return config;
  }

  static validateDisableToast(disableToast) {
    return Validator.validateBoolean(disableToast, "disableToast", false);
  }

  static validateDisableUi(disableUi) {
    return Validator.validateBoolean(disableUi, "disableUi", false);
  }

  static validateMinimizeUILocation(location) {
    return (
      Validator.validateEnum(location, "minimizeUILocation", [
        "left",
        "right",
      ]) || "right"
    );
  }

  static validateLogo(logo) {
    if (logo === undefined || logo === null) {
      return null;
    }

    const validatedLogo = Validator.validateString(logo, "Logo");

    // Check if it's a URL
    if (
      validatedLogo.startsWith("http://") ||
      validatedLogo.startsWith("https://")
    ) {
      return Validator.validateUrl(validatedLogo, "Logo");
    }

    // Check if it's a local file path
    if (
      validatedLogo.startsWith("./") ||
      validatedLogo.startsWith("../") ||
      validatedLogo.startsWith("/")
    ) {
      if (
        !/^[./\\a-zA-Z0-9_-]+\.(png|jpg|jpeg|gif|svg|webp)$/i.test(
          validatedLogo
        )
      ) {
        throw new Error(
          "Invalid logo file path. Must be a valid image file path"
        );
      }
      return validatedLogo;
    }

    throw new Error(
      "Logo must be either a valid URL or a valid local file path"
    );
  }

  static validateToastLocation(location) {
    return Validator.validateEnum(location, "Toast location", [
      "TOP_LEFT",
      "TOP_RIGHT",
    ]);
  }
}
