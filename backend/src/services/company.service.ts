import prisma from '../utils/prisma';
import { AppError, NotFoundError } from '../utils/errors';

interface CreateCompanyDto {
  name: string;
  slug: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface UpdateCompanyDto {
  name?: string;
  slug?: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
}

interface ListCompaniesParams {
  page?: number;
  limit?: number;
}

export class CompanyService {
  async list(params: ListCompaniesParams) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: { _count: { select: { users: true, projects: true } } },
      }),
      prisma.company.count(),
    ]);

    return {
      data: companies,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: number) {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: { select: { id: true, first_name: true, last_name: true, email: true, role: true } },
          },
        },
        _count: { select: { projects: true } },
      },
    });
    if (!company) throw new NotFoundError('Company not found');
    return company;
  }

  async create(data: CreateCompanyDto) {
    const existing = await prisma.company.findFirst({
      where: { OR: [{ name: data.name }, { slug: data.slug }] },
    });
    if (existing) throw new AppError('Company with this name or slug already exists', 409);

    return prisma.company.create({ data });
  }

  async update(id: number, data: UpdateCompanyDto) {
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundError('Company not found');

    if (data.name || data.slug) {
      const existing = await prisma.company.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(data.name ? [{ name: data.name }] : []),
            ...(data.slug ? [{ slug: data.slug }] : []),
          ],
        },
      });
      if (existing) throw new AppError('Company with this name or slug already exists', 409);
    }

    return prisma.company.update({ where: { id }, data });
  }

  async delete(id: number) {
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundError('Company not found');

    await prisma.company.delete({ where: { id } });
    return { id };
  }

  async addUser(companyId: number, userId: number, isDefault?: boolean) {
    const [company, user] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);
    if (!company) throw new NotFoundError('Company not found');
    if (!user) throw new NotFoundError('User not found');

    const existing = await prisma.companyUser.findUnique({
      where: { company_id_user_id: { company_id: companyId, user_id: userId } },
    });
    if (existing) throw new AppError('User is already a member of this company', 409);

    if (isDefault) {
      await prisma.companyUser.updateMany({
        where: { user_id: userId, is_default: true },
        data: { is_default: false },
      });
    }

    return prisma.companyUser.create({
      data: { company_id: companyId, user_id: userId, is_default: isDefault ?? false },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, email: true } },
        company: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async removeUser(companyId: number, userId: number) {
    const membership = await prisma.companyUser.findUnique({
      where: { company_id_user_id: { company_id: companyId, user_id: userId } },
    });
    if (!membership) throw new NotFoundError('User is not a member of this company');

    await prisma.companyUser.delete({
      where: { company_id_user_id: { company_id: companyId, user_id: userId } },
    });
    return { companyId, userId };
  }

  async getUserCompanies(userId: number) {
    const memberships = await prisma.companyUser.findMany({
      where: { user_id: userId },
      include: {
        company: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.company,
      is_default: m.is_default,
    }));
  }
}

export const companyService = new CompanyService();
