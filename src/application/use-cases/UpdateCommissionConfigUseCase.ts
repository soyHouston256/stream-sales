import { ICommissionConfigRepository } from "@/domain/repositories/ICommissionConfigRepository";
import { CommissionConfig, CommissionType } from "@/domain/entities/CommissionConfig";

export interface UpdateCommissionConfigInput {
  type: CommissionType;
  rate: number; // 0-100 (e.g., 5.5 = 5.5%)
  effectiveFrom?: Date;
}

export interface UpdateCommissionConfigOutput {
  config: CommissionConfig;
  previousConfig: CommissionConfig | null;
}

/**
 * Use Case: Update Commission Configuration
 *
 * Updates the commission configuration for a given type.
 * This will:
 * 1. Deactivate all previous configurations of this type
 * 2. Create a new active configuration
 * 3. Set the effective date (default: now)
 *
 * This ensures we maintain a complete audit trail of commission changes.
 */
export class UpdateCommissionConfigUseCase {
  constructor(
    private readonly commissionConfigRepository: ICommissionConfigRepository
  ) {}

  async execute(input: UpdateCommissionConfigInput): Promise<UpdateCommissionConfigOutput> {
    // Validate rate
    if (input.rate < 0 || input.rate > 100) {
      throw new Error('Commission rate must be between 0 and 100');
    }

    // Get current active config (for history)
    const previousConfig = await this.commissionConfigRepository.findActiveByType(input.type);

    // Deactivate all previous configs of this type
    await this.commissionConfigRepository.deactivateAllByType(input.type);

    // Create new active config
    const newConfig = CommissionConfig.create({
      type: input.type,
      rate: input.rate,
      effectiveFrom: input.effectiveFrom || new Date(),
    });

    // Save the new config
    const savedConfig = await this.commissionConfigRepository.save(newConfig);

    return {
      config: savedConfig,
      previousConfig,
    };
  }
}
