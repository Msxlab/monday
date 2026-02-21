import { ProjectStatus, Priority, UserRole, ProjectType, CountryTarget } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError, NotFoundError } from '../utils/errors';
import { createAuditLog } from '../utils/audit';
import { filterProjectForRole, canEditField } from '../utils/permissions';
import { eventBus, APP_EVENTS } from '../utils/event-bus';

interface CreateProjectDto {
  nj_number: string;
  title: string;
  project_type?: ProjectType;
  assigned_designer_id?: number;
  priority?: Priority;
  start_date?: Date;
  deadline?: Date;
  estimated_finish_date?: Date;
  country_target?: CountryTarget;
  notes?: string;
  admin_notes?: string;
}

interface UpdateProjectDto {
  title?: string;
  project_type?: ProjectType;
  assigned_designer_id?: number;
  priority?: Priority;
  status?: ProjectStatus;
  start_date?: Date;
  deadline?: Date;
  estimated_finish_date?: Date;
  actual_finish_date?: Date;
  country_target?: CountryTarget;
  notes?: string;
  admin_notes?: string;
}

interface ListProjectsParams {
  page?: number;
  limit?: number;
  status?: ProjectStatus | 'overdue';
  priority?: Priority;
  assigned_designer_id?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const VALID_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  new: ['designing', 'cancelled'],
  designing: ['revision', 'review', 'blocked', 'cancelled'],
  revision: ['designing', 'blocked', 'cancelled'],
  review: ['approved', 'revision', 'cancelled'],
  approved: ['in_production', 'cancelled'],
  in_production: ['done', 'cancelled'],
  done: [],
  cancelled: ['new'],
  blocked: ['designing', 'revision', 'cancelled'],
};

export class ProjectService {
  async create(data: CreateProjectDto, createdById: number, userRole: UserRole) {
    const existing = await prisma.project.findFirst({
      where: { nj_number: data.nj_number },
    });
    if (existing) {
      throw new AppError('NJ number already exists', 409);
    }

    if (data.assigned_designer_id) {
      const designer = await prisma.user.findUnique({
        where: { id: data.assigned_designer_id },
      });
      if (!designer || !designer.is_active) {
        throw new AppError('Assigned designer not found or inactive', 400);
      }
    }

    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          ...data,
          status: 'new',
          created_by_id: createdById,
          start_date: data.start_date || new Date(),
        },
        include: {
          assigned_designer: {
            select: { id: true, first_name: true, last_name: true, role: true },
          },
        },
      });

      await tx.projectStatusHistory.create({
        data: {
          project_id: created.id,
          from_status: null,
          to_status: 'new',
          changed_by_id: createdById,
        },
      });

      await tx.auditLog.create({
        data: {
          user_id: createdById,
          action: 'project_created',
          resource_type: 'project',
          resource_id: created.id,
          new_value: { nj_number: created.nj_number, title: created.title },
        },
      });

      return created;
    });

    // Emit project assigned event
    if (data.assigned_designer_id) {
      eventBus.emitEvent(APP_EVENTS.PROJECT_ASSIGNED, {
        projectId: project.id,
        designerId: data.assigned_designer_id,
        projectTitle: data.title,
        njNumber: data.nj_number,
        assignedById: createdById,
      });
    }

    return await filterProjectForRole(project as unknown as Record<string, unknown>, userRole, createdById);
  }

  async findById(id: number, userRole: UserRole, userId?: number) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        assigned_designer: {
          select: { id: true, first_name: true, last_name: true, role: true, avatar_url: true },
        },
        created_by: {
          select: { id: true, first_name: true, last_name: true },
        },
        financials: true,
        client: true,
        revisions: {
          orderBy: { revision_number: 'desc' },
        },
        status_history: {
          orderBy: { changed_at: 'desc' },
          take: 20,
          include: {
            changed_by: { select: { id: true, first_name: true, last_name: true } },
          },
        },
      },
    });

    if (!project) throw new NotFoundError('Project not found');

    if (userRole === 'designer' && project.assigned_designer_id !== userId) {
      throw new AppError('You do not have permission to view this project', 403);
    }

    if (userRole === 'senior_designer' && project.assigned_designer_id !== userId) {
      if (!['review', 'approved'].includes(project.status)) {
        throw new AppError('You do not have permission to view this project', 403);
      }
    }

    return await filterProjectForRole(project as unknown as Record<string, unknown>, userRole, userId);
  }

  async list(params: ListProjectsParams & { include_archived?: boolean }, userRole: UserRole, userId?: number) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // By default, exclude archived projects
    if (!params.include_archived) {
      where.is_archived = false;
    }

    if (params.status === 'overdue') {
      where.deadline = { lt: new Date(), not: null };
      where.status = { notIn: ['done', 'cancelled'] };
    } else if (params.status) {
      where.status = params.status;
    }
    if (params.priority) where.priority = params.priority;
    if (params.assigned_designer_id) where.assigned_designer_id = params.assigned_designer_id;

    if (userRole === 'designer') {
      where.assigned_designer_id = userId;
    }

    if (userRole === 'senior_designer') {
      where.OR = [
        { assigned_designer_id: userId },
        { status: { in: ['review', 'approved'] } },
      ];
    }

    if (params.search) {
      if (where.OR) {
        where.AND = [
          { OR: where.OR as Record<string, unknown>[] },
          { OR: [{ nj_number: { contains: params.search } }, { title: { contains: params.search } }] },
        ];
        delete where.OR;
      } else {
        where.OR = [
          { nj_number: { contains: params.search } },
          { title: { contains: params.search } },
        ];
      }
    }

    const orderBy: Record<string, string> = {};
    orderBy[params.sortBy || 'created_at'] = params.sortOrder || 'desc';

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          assigned_designer: {
            select: { id: true, first_name: true, last_name: true, avatar_url: true },
          },
          _count: {
            select: { revisions: true },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    const filtered = await Promise.all(
      projects.map((p) =>
        filterProjectForRole(p as unknown as Record<string, unknown>, userRole, userId)
      )
    );

    return {
      data: filtered,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(id: number, data: UpdateProjectDto, updatedById: number, userRole: UserRole, expectedUpdatedAt?: Date) {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundError('Project not found');

    // Optimistic locking: reject update if someone else modified the record
    if (expectedUpdatedAt) {
      const expected = new Date(expectedUpdatedAt).getTime();
      const actual = project.updated_at.getTime();
      if (expected !== actual) {
        throw new AppError('This project has been modified by another user. Please refresh and try again.', 409);
      }
    }

    // Ownership check: designer can only update own projects
    if (userRole === 'designer' && project.assigned_designer_id !== updatedById) {
      throw new AppError('You do not have permission to update this project', 403);
    }
    if (userRole === 'senior_designer' && project.assigned_designer_id !== updatedById) {
      if (!['review', 'approved'].includes(project.status)) {
        throw new AppError('You do not have permission to update this project', 403);
      }
    }

    // Write-time field filtering: strip fields user cannot edit
    const filteredData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && canEditField(key, userRole)) {
        filteredData[key] = value;
      }
    }
    data = filteredData as UpdateProjectDto;

    if (data.status && data.status !== project.status) {
      const allowed = VALID_STATUS_TRANSITIONS[project.status];
      if (!allowed.includes(data.status)) {
        throw new AppError(
          `Cannot transition from ${project.status} to ${data.status}`,
          400
        );
      }

      await prisma.projectStatusHistory.create({
        data: {
          project_id: id,
          from_status: project.status,
          to_status: data.status,
          changed_by_id: updatedById,
        },
      });

      if (data.status === 'done') {
        data.actual_finish_date = new Date();
      }
    }

    const oldValue = {
      status: project.status,
      priority: project.priority,
      assigned_designer_id: project.assigned_designer_id,
      deadline: project.deadline,
    };

    const updated = await prisma.project.update({
      where: { id },
      data,
      include: {
        assigned_designer: {
          select: { id: true, first_name: true, last_name: true, role: true },
        },
      },
    });

    await createAuditLog({
      userId: updatedById,
      action: 'project_updated',
      resourceType: 'project',
      resourceId: id,
      oldValue,
      newValue: data,
    });

    // Emit events for assignment or status change
    if (data.assigned_designer_id && data.assigned_designer_id !== project.assigned_designer_id) {
      eventBus.emitEvent(APP_EVENTS.PROJECT_ASSIGNED, {
        projectId: id,
        designerId: data.assigned_designer_id,
        projectTitle: updated.title,
        njNumber: updated.nj_number,
        assignedById: updatedById,
      });
    }
    if (data.status && data.status !== project.status) {
      eventBus.emitEvent(APP_EVENTS.PROJECT_STATUS_CHANGED, {
        projectId: id,
        fromStatus: project.status,
        toStatus: data.status,
        changedById: updatedById,
        designerId: updated.assigned_designer_id,
        projectTitle: updated.title,
        njNumber: updated.nj_number,
      });
    }

    return await filterProjectForRole(updated as unknown as Record<string, unknown>, userRole, updatedById);
  }

  async updateStatus(
    id: number,
    newStatus: ProjectStatus,
    userId: number,
    userRole: UserRole,
    reason?: string
  ) {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundError('Project not found');

    // Ownership check: designer can only change status of own projects
    if (userRole === 'designer' && project.assigned_designer_id !== userId) {
      throw new AppError('You do not have permission to change status of this project', 403);
    }
    if (userRole === 'senior_designer' && project.assigned_designer_id !== userId) {
      if (!['review', 'approved'].includes(project.status)) {
        throw new AppError('You do not have permission to change status of this project', 403);
      }
    }

    const allowed = VALID_STATUS_TRANSITIONS[project.status];
    if (!allowed.includes(newStatus)) {
      throw new AppError(
        `Cannot transition from ${project.status} to ${newStatus}`,
        400
      );
    }

    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'done') {
      updateData.actual_finish_date = new Date();
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.project.update({
        where: { id },
        data: updateData,
        include: {
          assigned_designer: {
            select: { id: true, first_name: true, last_name: true, role: true },
          },
        },
      });

      await tx.projectStatusHistory.create({
        data: {
          project_id: id,
          from_status: project.status,
          to_status: newStatus,
          changed_by_id: userId,
          reason,
        },
      });

      await tx.auditLog.create({
        data: {
          user_id: userId,
          action: 'status_changed',
          resource_type: 'project',
          resource_id: id,
          old_value: { status: project.status },
          new_value: { status: newStatus },
        },
      });

      return result;
    });

    // Emit status change event
    eventBus.emitEvent(APP_EVENTS.PROJECT_STATUS_CHANGED, {
      projectId: id,
      fromStatus: project.status,
      toStatus: newStatus,
      changedById: userId,
      designerId: updated.assigned_designer_id,
      projectTitle: updated.title,
      njNumber: updated.nj_number,
    });

    // Emit revision event if transitioning to revision
    if (newStatus === 'revision') {
      const changer = await prisma.user.findUnique({ where: { id: userId }, select: { first_name: true, last_name: true } });
      eventBus.emitEvent(APP_EVENTS.REVISION_REQUESTED, {
        projectId: id,
        designerId: updated.assigned_designer_id,
        projectTitle: updated.title,
        njNumber: updated.nj_number,
        requestedByName: changer ? `${changer.first_name} ${changer.last_name}` : 'System',
      });
    }

    return await filterProjectForRole(updated as unknown as Record<string, unknown>, userRole, userId);
  }

  async clone(id: number, newNjNumber: string, createdById: number, userRole: UserRole) {
    const source = await prisma.project.findUnique({ where: { id } });
    if (!source) throw new NotFoundError('Project not found');

    const existing = await prisma.project.findFirst({ where: { nj_number: newNjNumber } });
    if (existing) throw new AppError('NJ number already exists', 409);

    const cloned = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          nj_number: newNjNumber,
          title: source.title,
          project_type: source.project_type,
          assigned_designer_id: source.assigned_designer_id,
          priority: source.priority,
          status: 'new',
          country_target: source.country_target,
          notes: source.notes,
          admin_notes: source.admin_notes,
          is_hard_deadline: source.is_hard_deadline,
          start_date: new Date(),
          deadline: source.deadline,
          estimated_finish_date: source.estimated_finish_date,
          created_by_id: createdById,
        },
        include: {
          assigned_designer: { select: { id: true, first_name: true, last_name: true, role: true } },
        },
      });

      await tx.projectStatusHistory.create({
        data: { project_id: created.id, from_status: null, to_status: 'new', changed_by_id: createdById },
      });

      await tx.auditLog.create({
        data: {
          user_id: createdById,
          action: 'project_cloned',
          resource_type: 'project',
          resource_id: created.id,
          new_value: { cloned_from: id, nj_number: newNjNumber },
        },
      });

      return created;
    });

    return await filterProjectForRole(cloned as unknown as Record<string, unknown>, userRole, createdById);
  }

  async getStats() {
    const [
      totalActive,
      totalOverdue,
      totalReview,
      totalProduction,
      statusCounts,
    ] = await Promise.all([
      prisma.project.count({
        where: { status: { notIn: ['done', 'cancelled'] } },
      }),
      prisma.project.count({
        where: {
          deadline: { lt: new Date() },
          status: { notIn: ['done', 'cancelled'] },
        },
      }),
      prisma.project.count({ where: { status: 'review' } }),
      prisma.project.count({ where: { status: 'in_production' } }),
      prisma.project.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    return {
      totalActive,
      totalOverdue,
      totalReview,
      totalProduction,
      statusCounts: statusCounts.reduce(
        (acc, item) => ({ ...acc, [item.status]: item._count.id }),
        {} as Record<string, number>
      ),
    };
  }

  async bulkUpdateStatus(ids: number[], status: ProjectStatus, userId: number) {
    const projects = await prisma.project.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    });

    const validIds: number[] = [];
    const skipped: number[] = [];

    for (const project of projects) {
      const allowed = VALID_STATUS_TRANSITIONS[project.status] ?? [];
      if (allowed.includes(status)) {
        validIds.push(project.id);
      } else {
        skipped.push(project.id);
      }
    }

    if (validIds.length === 0) {
      throw new AppError('Hiçbir proje için geçerli durum geçişi bulunamadı', 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.project.updateMany({
        where: { id: { in: validIds } },
        data: { status },
      });

      await tx.projectStatusHistory.createMany({
        data: validIds.map((id) => ({
          project_id: id,
          from_status: projects.find((p) => p.id === id)!.status,
          to_status: status,
          changed_by_id: userId,
          reason: 'Toplu durum güncellemesi',
        })),
      });

      await tx.auditLog.create({
        data: {
          user_id: userId,
          action: 'bulk_status_update',
          resource_type: 'project',
          new_value: { ids: validIds, status, skipped },
        },
      });
    });

    return { updated: validIds.length, skipped: skipped.length };
  }

  async bulkCancel(ids: number[], userId: number) {
    await prisma.project.updateMany({
      where: { id: { in: ids } },
      data: { status: 'cancelled' as ProjectStatus },
    });

    await createAuditLog({
      userId,
      action: 'bulk_cancel',
      resourceType: 'project',
      newValue: { ids },
    });
  }

  async archive(id: number, userId: number) {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundError('Project not found');
    if (project.is_archived) throw new AppError('Project is already archived', 400);

    await prisma.project.update({ where: { id }, data: { is_archived: true } });
    await createAuditLog({
      userId,
      action: 'project_archived',
      resourceType: 'project',
      resourceId: id,
    });
    return { archived: true };
  }

  async restore(id: number, userId: number) {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundError('Project not found');
    if (!project.is_archived) throw new AppError('Project is not archived', 400);

    await prisma.project.update({ where: { id }, data: { is_archived: false } });
    await createAuditLog({
      userId,
      action: 'project_restored',
      resourceType: 'project',
      resourceId: id,
    });
    return { restored: true };
  }

  async requestDeadlineExtension(projectId: number, requestedDate: Date, reason: string, userId: number, userRole: UserRole) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { assigned_designer: { select: { id: true } } },
    });
    if (!project) throw new NotFoundError('Project not found');

    // Only project owner (designer) or admin can request deadline extension
    const isAdmin = ['super_admin', 'admin'].includes(userRole);
    if (!isAdmin && project.assigned_designer_id !== userId) {
      throw new AppError('You can only request deadline extension for your own projects', 403);
    }

    await createAuditLog({
      userId,
      action: 'deadline_extension_requested',
      resourceType: 'project',
      resourceId: projectId,
      newValue: { requested_date: requestedDate, reason },
    });

    const adminUsers = await prisma.user.findMany({
      where: { role: { in: ['super_admin', 'admin'] }, is_active: true },
      select: { id: true },
    });

    await prisma.notification.createMany({
      data: adminUsers.map((a) => ({
        user_id: a.id,
        type: 'deadline_warning' as never,
        title: 'Deadline Uzatma Talebi',
        message: `${project.nj_number} - ${project.title} için deadline uzatma talebi. Talep: ${requestedDate.toLocaleDateString('tr-TR')}. Sebep: ${reason}`,
        action_url: `/admin/projects/${projectId}`,
      })),
    });
  }
}

export const projectService = new ProjectService();
