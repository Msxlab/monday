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
    // Single query: fetch all completed projects in the last 8 weeks
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 8 * 7);
    eightWeeksAgo.setHours(0, 0, 0, 0);

    const completedProjects = await prisma.project.findMany({
      where: {
        status: 'done',
        actual_finish_date: { gte: eightWeeksAgo },
      },
      select: { actual_finish_date: true },
    });

    // Build week buckets
    const weeks: { week: string; completed: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      weekEnd.setHours(23, 59, 59, 999);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const count = completedProjects.filter((p) => {
        const d = p.actual_finish_date;
        return d && d >= weekStart && d <= weekEnd;
      }).length;

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

    const designerIds = designers.map((d) => d.id);
    if (designerIds.length === 0) return [];

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Batch queries: 4 groupBy instead of N×4
    const [completedThisMonthGroup, completed90Group, overdueGroup, revisionGroup] = await Promise.all([
      prisma.project.groupBy({
        by: ['assigned_designer_id'],
        where: { assigned_designer_id: { in: designerIds }, status: 'done', actual_finish_date: { gte: monthStart } },
        _count: { id: true },
      }),
      prisma.project.groupBy({
        by: ['assigned_designer_id'],
        where: { assigned_designer_id: { in: designerIds }, status: 'done', actual_finish_date: { gte: ninetyDaysAgo } },
        _count: { id: true },
      }),
      prisma.project.groupBy({
        by: ['assigned_designer_id'],
        where: { assigned_designer_id: { in: designerIds }, deadline: { lt: now }, status: { notIn: ['done', 'cancelled'] } },
        _count: { id: true },
      }),
      prisma.projectRevision.findMany({
        where: { project: { assigned_designer_id: { in: designerIds } }, created_at: { gte: ninetyDaysAgo } },
        select: { project: { select: { assigned_designer_id: true } } },
      }),
    ]);

    // Build lookup maps
    const monthMap = new Map(completedThisMonthGroup.map((r) => [r.assigned_designer_id, r._count.id]));
    const d90Map = new Map(completed90Group.map((r) => [r.assigned_designer_id, r._count.id]));
    const overdueMap = new Map(overdueGroup.map((r) => [r.assigned_designer_id, r._count.id]));
    const revisionMap = new Map<number, number>();
    for (const rev of revisionGroup) {
      const did = rev.project.assigned_designer_id;
      if (did) revisionMap.set(did, (revisionMap.get(did) || 0) + 1);
    }

    return designers.map((d) => {
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
        completedThisMonth: monthMap.get(d.id) || 0,
        completedLast90Days: d90Map.get(d.id) || 0,
        overdueProjects: overdueMap.get(d.id) || 0,
        revisionCount: revisionMap.get(d.id) || 0,
      };
    });
  }

  async getMonthlyTrend(designerId?: number) {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const designerFilter = designerId ? { assigned_designer_id: designerId } : {};

    // 2 queries instead of 12
    const [completedProjects, startedProjects] = await Promise.all([
      prisma.project.findMany({
        where: { ...designerFilter, status: 'done', actual_finish_date: { gte: sixMonthsAgo } },
        select: { actual_finish_date: true },
      }),
      prisma.project.findMany({
        where: { ...designerFilter, start_date: { gte: sixMonthsAgo } },
        select: { start_date: true },
      }),
    ]);

    const months: { month: string; completed: number; started: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      end.setHours(23, 59, 59, 999);

      const completed = completedProjects.filter((p) => {
        const d = p.actual_finish_date;
        return d && d >= start && d <= end;
      }).length;

      const started = startedProjects.filter((p) => {
        const d = p.start_date;
        return d && d >= start && d <= end;
      }).length;

      months.push({
        month: start.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
        completed,
        started,
      });
    }

    return months;
  }

  async getSlaStats() {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    // Completed projects with deadlines (for on-time rate)
    const completedWithDeadline = await prisma.project.findMany({
      where: {
        status: 'done',
        deadline: { not: null },
        actual_finish_date: { gte: threeMonthsAgo },
      },
      select: { id: true, deadline: true, actual_finish_date: true, nj_number: true, title: true },
    });

    const onTime = completedWithDeadline.filter((p) => p.actual_finish_date! <= p.deadline!).length;
    const late = completedWithDeadline.length - onTime;
    const onTimeRate = completedWithDeadline.length > 0
      ? Math.round((onTime / completedWithDeadline.length) * 100)
      : 100;

    // Average delay for late projects (in days)
    const lateProjects = completedWithDeadline.filter((p) => p.actual_finish_date! > p.deadline!);
    const avgDelay = lateProjects.length > 0
      ? Math.round(lateProjects.reduce((sum, p) => {
          return sum + Math.round((p.actual_finish_date!.getTime() - p.deadline!.getTime()) / (1000 * 60 * 60 * 24));
        }, 0) / lateProjects.length)
      : 0;

    // Projects at risk (active, deadline within 3 days or already passed)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const atRisk = await prisma.project.findMany({
      where: {
        status: { notIn: ['done', 'cancelled'] },
        deadline: { not: null, lte: threeDaysFromNow },
      },
      select: {
        id: true,
        nj_number: true,
        title: true,
        status: true,
        deadline: true,
        assigned_designer: { select: { first_name: true, last_name: true } },
      },
      orderBy: { deadline: 'asc' },
      take: 20,
    });

    return {
      onTimeRate,
      onTime,
      late,
      totalMeasured: completedWithDeadline.length,
      avgDelayDays: avgDelay,
      atRiskProjects: atRisk.map((p) => ({
        ...p,
        daysUntilDeadline: Math.round((p.deadline!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      })),
    };
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
