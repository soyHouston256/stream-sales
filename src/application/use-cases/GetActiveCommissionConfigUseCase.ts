import { ICommissionConfigRepository } from "@/domain/repositories/ICommissionConfigRepository";
import { CommissionConfig, CommissionType } from "@/domain/entities/CommissionConfig";

export interface GetActiveCommissionConfigInput {
  type: CommissionType;
}

export interface GetActiveCommissionConfigOutput {
  config: CommissionConfig | null;
  rateAsDecimal: number; // For easy use in calculations (e.g., 0.05 for 5%)
}

/**
 * Use Case: Get Active Commission Configuration
 *
 * Retrieves the currently active commission configuration for a given type.
 * Returns null if no active configuration exists.
 */
export class GetActiveCommissionConfigUseCase {
  constructor(
    private readonly commissionConfigRepository: ICommissionConfigRepository
  ) {}

  async execute(input: GetActiveCommissionConfigInput): Promise<GetActiveCommissionConfigOutput> {
    const config = await this.commissionConfigRepository.findActiveByType(input.type);

    return {
      config,
      rateAsDecimal: config ? config.rateAsDecimal.toNumber() : 0,
    };
  }
}
