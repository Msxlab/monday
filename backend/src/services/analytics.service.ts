import prisma from '../utils/prisma';

export class AnalyticsService {
  async getOverview(dateFrom?: string, dateTo?: string) {
    const dateFilter = (dateFrom || dateTo) ? {
      created_at: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(new Date(dateTo).setHours(23, 59, 59, 999)) } : {}),
      },
    } : {};

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalActive,
      totalOverdue,
      totalReview,
      totalProduction,
      totalCompleted,
      totalNew,
      completedThisMonth,
      completedLastMonth,
      statusCounts,
      priorityCounts,
    ] = await Promise.all([
      prisma.project.count({ where: { ...dateFilter, status: { notIn: ['done', 'cancelled'] } } }),
      prisma.project.count({ where: { ...dateFilter, status: { notIn: ['done', 'cancelled'] }, deadline: { lt: now } } }),
      prisma.project.count({ where: { ...dateFilter, status: 'review' } }),
      prisma.project.count({ where: { ...dateFilter, status: 'in_production' } }),
      prisma.project.count({ where: { ...dateFilter, status: 'done' } }),
      prisma.project.count({ where: { ...dateFilter, status: 'new' } }),
      prisma.project.count({ where: { ...dateFilter, status: 'done', actual_finish_date: { gte: monthStart } } }),
      prisma.project.count({ where: { ...dateFilter, status: 'done', actual_finish_date: { gte: prevMonthStart, lt: monthStart } } }),
      prisma.project.groupBy({ by: ['status'], where: dateFilter as Record<string, unknown>, _count: { id: true } }),
      prisma.project.groupBy({ by: ['priority'], where: dateFilter as Record<string, unknown>, _count: { id: true } }),
    ]);

    const [avgCompletionDays, revisionTotal, completedForRevision] = await Promise.all([
      prisma.project.findMany({
        where: { ...dateFilter, status: 'done', start_date: { not: null }, actual_finish_date: { not: null } },
        select: { start_date: true, actual_finish_date: true },
        take: 200,
      }).then((projects) => {
        if (projects.length === 0) return null;
        const totalDays = projects.reduce((sum, p) => {
          if (!p.start_date || !p.actual_finish_date) return sum;
          return sum + Math.round((p.actual_finish_date.getTime() - p.start_date.getTime()) / (1000 * 60 * 60 * 24));
        }, 0);
        return Math.round(totalDays / projects.length);
      }),
      prisma.projectRevision.count({ where: { created_at: dateFilter.created_at } }),
      prisma.project.count({ where: { ...dateFilter } }),
    ]);

    const weeklyData = await this.getWeeklyCompletions();

    return {
      totalActive,
      totalOverdue,
      totalReview,
      totalProduction,
      totalCompleted,
      totalNew,
      completedThisMonth,
      completedLastMonth,
      completedGrowth:
        completedLastMonth > 0
          ? Math.round(((completedThisMonth - completedLastMonth) / completedLastMonth) * 100)
          : null,
      avgCompletionDays,
      revisionRate: completedForRevision > 0 ? Math.round((revisionTotal / completedForRevision) * 100) / 100 : 0,
      statusCounts: statusCounts.reduce(
        (acc, s) => ({ ...acc, [s.status]: s._count.id }),
        {} as Record<string, number>
      ),
      priorityCounts: priorityCounts.reduce(
        (acc, p) => ({ ...acc, [p.priority]: p._count.id }),
        {} as Record<string, number>
      ),
      weeklyData,
    };
  }

  private async getWeeklyCompletions() {
    const weeks: { week: string; completed: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      weekEnd.setHours(23, 59, 59, 999);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const count = await prisma.project.count({
        where: {
          status: 'done',
          actual_finish_date: { gte: weekStart, lte: weekEnd },
        },
      });

      weeks.push({
        week: weekStart.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }),
        completed: count,
      });
    }
    return weeks;
  }

  async getDesignerPerformance(designerId?: number) {
    const where: Record<string, unknown> = {
      role: { in: ['designer', 'senior_designer'] },
      is_active: true,
    };
    if (designerId) where.id = designerId;

    const designers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        role: true,
        max_capacity: true,
        _count: { select: { assigned_projects: true } },
      },
    });

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const results = await Promise.all(
      designers.map(async (d) => {
        const [completedThisMonth, completedTotal, overdueProjects, revisionCount] =
          await Promise.all([
            prisma.project.count({
              where: {
                assigned_designer_id: d.id,
                status: 'done',
                actual_finish_date: { gte: monthStart },
              },
            }),
            prisma.project.count({
              where: {
                assigned_designer_id: d.id,
                status: 'done',
                actual_finish_date: { gte: ninetyDaysAgo },
              },
            }),
            prisma.project.count({
              where: {
                assigned_designer_id: d.id,
                deadline: { lt: now },
                status: { notIn: ['done', 'cancelled'] },
              },
            }),
            prisma.projectRevision.count({
              where: {
                project: { assigned_designer_id: d.id },
                created_at: { gte: ninetyDaysAgo },
              },
            }),
          ]);

        const activeProjects = d._count.assigned_projects;
        const capacityPct = Math.round((activeProjects / (d.max_capacity || 5)) * 100);

        return {
          id: d.id,
          first_name: d.first_name,
          last_name: d.last_name,
          role: d.role,
          activeProjects,
          maxCapacity: d.max_capacity,
          capacityPct,
          completedThisMonth,
          completedLast90Days: completedTotal,
          overdueProjects,
          revisionCount,
        };
      })
    );

    return results;
  }

  async getMonthlyTrend(designerId?: number) {
    const months: { month: string; completed: number; started: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const designerFilter = designerId ? { assigned_designer_id: designerId } : {};

      const [completed, started] = await Promise.all([
        prisma.project.count({
          where: { ...designerFilter, status: 'done', actual_finish_date: { gte: start, lte: end } },
        }),
        prisma.project.count({
          where: { ...designerFilter, start_date: { gte: start, lte: end } },
        }),
      ]);

      months.push({
        month: start.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
        completed,
        started,
      });
    }

    return months;
  }

  async getRevisionAnalysis() {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const revisions = await prisma.projectRevision.groupBy({
      by: ['revision_type'],
      _count: { id: true },
      where: { created_at: { gte: ninetyDaysAgo } },
    });

    return revisions.map((r) => ({
      type: r.revision_type,
      count: r._count.id,
    }));
  }
}

export const analyticsService = new AnalyticsService();
