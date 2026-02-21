import { PaymentStatus } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError, NotFoundError } from '../utils/errors';
import { createAuditLog } from '../utils/audit';

interface UpsertFinancialDto {
  project_id: number;
  client_budget?: number;
  project_price?: number;
  cost_price?: number;
  profit_margin?: number;
  payment_status?: PaymentStatus;
  invoice_details?: string;
}

export class FinanceService {
  async getByProjectId(projectId: number, viewerUserId?: number) {
    const financial = await prisma.projectFinancial.findUnique({
      where: { project_id: projectId },
      include: {
        project: {
          select: { id: true, nj_number: true, title: true, status: true },
        },
      },
    });
    if (!financial) throw new NotFoundError('Financial data not found for this project');

    if (viewerUserId) {
      await createAuditLog({
        userId: viewerUserId,
        action: 'finance_viewed',
        resourceType: 'project_financial',
        resourceId: projectId,
      });
    }

    return financial;
  }

  async upsert(data: UpsertFinancialDto, userId: number) {
    const project = await prisma.project.findUnique({ where: { id: data.project_id } });
    if (!project) throw new NotFoundError('Project not found');

    const existing = await prisma.projectFinancial.findUnique({
      where: { project_id: data.project_id },
    });

    const financialData = {
      client_budget: data.client_budget,
      project_price: data.project_price,
      cost_price: data.cost_price,
      profit_margin: data.profit_margin,
      payment_status: data.payment_status,
      invoice_details: data.invoice_details,
    };

    let result;
    if (existing) {
      result = await prisma.projectFinancial.update({
        where: { project_id: data.project_id },
        data: financialData,
      });

      await createAuditLog({
        userId,
        action: 'financial_updated',
        resourceType: 'project_financial',
        resourceId: existing.id,
        oldValue: {
          client_budget: existing.client_budget?.toString(),
          project_price: existing.project_price?.toString(),
          payment_status: existing.payment_status,
        },
        newValue: financialData,
      });
    } else {
      result = await prisma.projectFinancial.create({
        data: {
          project_id: data.project_id,
          ...financialData,
        },
      });

      await createAuditLog({
        userId,
        action: 'financial_created',
        resourceType: 'project_financial',
        resourceId: result.id,
        newValue: financialData,
      });
    }

    return result;
  }

  async updatePaymentStatus(projectId: number, status: PaymentStatus, userId: number) {
    const financial = await prisma.projectFinancial.findUnique({
      where: { project_id: projectId },
    });
    if (!financial) throw new NotFoundError('Financial data not found');

    const updated = await prisma.projectFinancial.update({
      where: { project_id: projectId },
      data: { payment_status: status },
    });

    await createAuditLog({
      userId,
      action: 'payment_status_updated',
      resourceType: 'project_financial',
      resourceId: financial.id,
      oldValue: { payment_status: financial.payment_status },
      newValue: { payment_status: status },
    });

    return updated;
  }

  async getSummary() {
    // Use aggregate instead of loading all records into memory
    const [aggregates, paymentGroups, totalProjects] = await Promise.all([
      prisma.projectFinancial.aggregate({
        _sum: { project_price: true, cost_price: true },
      }),
      prisma.projectFinancial.groupBy({
        by: ['payment_status'],
        _count: { id: true },
      }),
      prisma.projectFinancial.count(),
    ]);

    const totalRevenue = aggregates._sum.project_price?.toNumber() ?? 0;
    const totalCost = aggregates._sum.cost_price?.toNumber() ?? 0;
    const totalProfit = totalRevenue - totalCost;

    const paymentCounts = {
      pending: 0,
      partial: 0,
      paid: 0,
      overdue: 0,
    };
    for (const g of paymentGroups) {
      if (g.payment_status in paymentCounts) {
        paymentCounts[g.payment_status as keyof typeof paymentCounts] = g._count.id;
      }
    }

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      avgMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      paymentCounts,
      totalProjects,
    };
  }

  async listAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [financials, total] = await Promise.all([
      prisma.projectFinancial.findMany({
        skip,
        take: limit,
        orderBy: { updated_at: 'desc' },
        include: {
          project: {
            select: { id: true, nj_number: true, title: true, status: true },
          },
        },
      }),
      prisma.projectFinancial.count(),
    ]);

    return {
      data: financials,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

export const financeService = new FinanceService();
