import { PrismaClient } from "@prisma/client";
import { CommissionConfig, CommissionType } from "@/domain/entities/CommissionConfig";
import { ICommissionConfigRepository } from "@/domain/repositories/ICommissionConfigRepository";
import { Decimal } from "decimal.js";

export class PrismaCommissionConfigRepository implements ICommissionConfigRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findActiveByType(type: CommissionType): Promise<CommissionConfig | null> {
    const config = await this.prisma.commissionConfig.findFirst({
      where: {
        type,
        isActive: true,
      },
      orderBy: {
        effectiveFrom: 'desc',
      },
    });

    return config ? this.toDomain(config) : null;
  }

  async findAllByType(type: CommissionType): Promise<CommissionConfig[]> {
    const configs = await this.prisma.commissionConfig.findMany({
      where: { type },
      orderBy: {
        effectiveFrom: 'desc',
      },
    });

    return configs.map(config => this.toDomain(config));
  }

  async findById(id: string): Promise<CommissionConfig | null> {
    const config = await this.prisma.commissionConfig.findUnique({
      where: { id },
    });

    return config ? this.toDomain(config) : null;
  }

  async save(config: CommissionConfig): Promise<CommissionConfig> {
    const data = config.toPersistence();

    const saved = await this.prisma.commissionConfig.upsert({
      where: { id: data.id },
      create: data,
      update: {
        rate: data.rate,
        isActive: data.isActive,
        effectiveFrom: data.effectiveFrom,
        updatedAt: data.updatedAt,
      },
    });

    return this.toDomain(saved);
  }

  async deactivateAllByType(type: CommissionType): Promise<void> {
    await this.prisma.commissionConfig.updateMany({
      where: {
        type,
        isActive: true,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  async findAll(): Promise<CommissionConfig[]> {
    const configs = await this.prisma.commissionConfig.findMany({
      orderBy: [
        { effectiveFrom: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return configs.map(config => this.toDomain(config));
  }

  private toDomain(data: any): CommissionConfig {
    return CommissionConfig.fromPersistence({
      id: data.id,
      type: data.type,
      rate: new Decimal(data.rate.toString()),
      isActive: data.isActive,
      effectiveFrom: data.effectiveFrom,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
