import { OrderStatus, CountryTarget } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError, NotFoundError } from '../utils/errors';
import { createAuditLog } from '../utils/audit';
import { eventBus, APP_EVENTS } from '../utils/event-bus';

interface CreateOrderDto {
  project_id: number;
  country: CountryTarget;
  estimated_arrival?: Date;
  tracking_info?: string;
  notes?: string;
}

interface UpdateOrderDto {
  order_status?: OrderStatus;
  estimated_arrival?: Date;
  actual_arrival?: Date;
  tracking_info?: string;
  notes?: string;
}

interface ListOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  country?: CountryTarget;
}

export class ProductionService {
  async create(data: CreateOrderDto, initiatedById: number) {
    const project = await prisma.project.findUnique({ where: { id: data.project_id } });
    if (!project) throw new NotFoundError('Project not found');
    if (!['approved', 'in_production'].includes(project.status)) {
      throw new AppError('Project must be approved before creating a production order', 400);
    }

    const order = await prisma.productionOrder.create({
      data: {
        project_id: data.project_id,
        country: data.country,
        order_status: 'pending_approval',
        initiated_by_id: initiatedById,
        estimated_arrival: data.estimated_arrival,
        tracking_info: data.tracking_info,
        notes: data.notes,
      },
      include: {
        project: { select: { id: true, nj_number: true, title: true } },
        initiated_by: { select: { id: true, first_name: true, last_name: true } },
      },
    });

    await createAuditLog({
      userId: initiatedById,
      action: 'production_order_created',
      resourceType: 'production_order',
      resourceId: order.id,
      newValue: { project_id: data.project_id, country: data.country },
    });

    const initiator = order.initiated_by;
    eventBus.emitEvent(APP_EVENTS.PRODUCTION_ORDER_CREATED, {
      orderId: order.id,
      projectTitle: order.project.title,
      njNumber: order.project.nj_number,
      initiatedByName: initiator ? `${initiator.first_name} ${initiator.last_name}` : 'System',
    });

    return order;
  }

  async list(params: ListOrdersParams) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.status) where.order_status = params.status;
    if (params.country) where.country = params.country;

    const [orders, total] = await Promise.all([
      prisma.productionOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          project: { select: { id: true, nj_number: true, title: true, project_type: true } },
          initiated_by: { select: { id: true, first_name: true, last_name: true } },
          approved_by: { select: { id: true, first_name: true, last_name: true } },
        },
      }),
      prisma.productionOrder.count({ where }),
    ]);

    return {
      data: orders,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: number) {
    const order = await prisma.productionOrder.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, nj_number: true, title: true, project_type: true, status: true } },
        initiated_by: { select: { id: true, first_name: true, last_name: true } },
        approved_by: { select: { id: true, first_name: true, last_name: true } },
      },
    });
    if (!order) throw new NotFoundError('Production order not found');
    return order;
  }

  private static VALID_TRANSITIONS: Record<string, string[]> = {
    pending_approval: ['approved', 'rejected'],
    approved: ['ordered', 'rejected'],
    ordered: ['shipped', 'rejected'],
    shipped: ['in_customs', 'delivered'],
    in_customs: ['delivered'],
    delivered: [],
    rejected: [],
    rework: ['ordered', 'rejected'],
  };

  async update(id: number, data: UpdateOrderDto, userId: number) {
    const order = await prisma.productionOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundError('Production order not found');

    if (data.order_status) {
      const allowed = ProductionService.VALID_TRANSITIONS[order.order_status] || [];
      if (!allowed.includes(data.order_status)) {
        throw new AppError(
          `Invalid status transition: ${order.order_status} → ${data.order_status}. Allowed: ${allowed.join(', ') || 'none'}`,
          400
        );
      }
    }

    const updateData: Record<string, unknown> = { ...data };

    if (data.order_status === 'approved') {
      updateData.approved_by_id = userId;
      updateData.order_date = new Date();

      const project = await prisma.project.findUnique({ where: { id: order.project_id } });
      if (project && project.status === 'approved') {
        await prisma.project.update({
          where: { id: order.project_id },
          data: { status: 'in_production' },
        });
        await prisma.projectStatusHistory.create({
          data: {
            project_id: order.project_id,
            from_status: project.status,
            to_status: 'in_production',
            changed_by_id: userId,
            reason: 'Production order approved',
          },
        });
      }
    }

    if (data.order_status === 'delivered') {
      updateData.actual_arrival = data.actual_arrival ?? new Date();
    }

    const updated = await prisma.productionOrder.update({
      where: { id },
      data: updateData,
      include: {
        project: { select: { id: true, nj_number: true, title: true } },
      },
    });

    await createAuditLog({
      userId,
      action: 'production_order_updated',
      resourceType: 'production_order',
      resourceId: id,
      oldValue: { status: order.order_status },
      newValue: data,
    });

    if (data.order_status) {
      const project = await prisma.project.findUnique({
        where: { id: order.project_id },
        select: { title: true, nj_number: true, assigned_designer_id: true },
      });
      eventBus.emitEvent(APP_EVENTS.PRODUCTION_ORDER_UPDATED, {
        orderId: id,
        projectId: order.project_id,
        newStatus: data.order_status,
        projectTitle: project?.title ?? '',
        njNumber: project?.nj_number ?? '',
        designerId: project?.assigned_designer_id ?? null,
      });
    }

    return updated;
  }

  async delete(id: number, userId: number) {
    const order = await prisma.productionOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundError('Production order not found');
    if (order.order_status === 'delivered') {
      throw new AppError('Teslim edilmiş sipariş silinemez', 400);
    }

    await prisma.productionOrder.delete({ where: { id } });

    await createAuditLog({
      userId,
      action: 'production_order_deleted',
      resourceType: 'production_order',
      resourceId: id,
      oldValue: { project_id: order.project_id, status: order.order_status },
    });

    return { id };
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [pendingApproval, active, deliveredThisMonth] = await Promise.all([
      prisma.productionOrder.count({ where: { order_status: 'pending_approval' } }),
      prisma.productionOrder.count({
        where: { order_status: { in: ['approved', 'ordered', 'shipped', 'in_customs'] } },
      }),
      prisma.productionOrder.count({
        where: { order_status: 'delivered', actual_arrival: { gte: monthStart } },
      }),
    ]);

    return { pendingApproval, active, deliveredThisMonth };
  }

  async getApprovedProjects() {
    return prisma.project.findMany({
      where: { status: 'approved' },
      select: {
        id: true,
        nj_number: true,
        title: true,
        project_type: true,
        country_target: true,
        assigned_designer: { select: { id: true, first_name: true, last_name: true } },
      },
      orderBy: { updated_at: 'desc' },
    });
  }
}

export const productionService = new ProductionService();
