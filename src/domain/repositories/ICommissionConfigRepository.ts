import { CommissionConfig, CommissionType } from "../entities/CommissionConfig";

export interface ICommissionConfigRepository {
  /**
   * Find active commission configuration by type
   */
  findActiveByType(type: CommissionType): Promise<CommissionConfig | null>;

  /**
   * Find all commission configurations by type (including inactive)
   */
  findAllByType(type: CommissionType): Promise<CommissionConfig[]>;

  /**
   * Find configuration by ID
   */
  findById(id: string): Promise<CommissionConfig | null>;

  /**
   * Save a new or updated commission configuration
   */
  save(config: CommissionConfig): Promise<CommissionConfig>;

  /**
   * Deactivate all configurations of a given type
   */
  deactivateAllByType(type: CommissionType): Promise<void>;

  /**
   * Get all configurations (for history)
   */
  findAll(): Promise<CommissionConfig[]>;
}
