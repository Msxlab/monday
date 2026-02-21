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
          select: { id: true, first_name: true, last_name: true, email: true, role: true },
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

    if (user.company_id === companyId) throw new AppError('User is already a member of this company', 409);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        company_id: companyId,
        active_company_id: isDefault ? companyId : user.active_company_id,
      },
      select: { id: true, first_name: true, last_name: true, email: true },
    });

    return { company: { id: company.id, name: company.name, slug: company.slug }, user: updatedUser, is_default: isDefault ?? false };
  }

  async removeUser(companyId: number, userId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.company_id !== companyId) throw new NotFoundError('User is not a member of this company');

    await prisma.user.update({
      where: { id: userId },
      data: { company_id: null, active_company_id: user.active_company_id === companyId ? null : user.active_company_id },
    });
    return { companyId, userId };
  }

  async getUserCompanies(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        company_id: true,
        active_company_id: true,
        company: true,
      },
    });

    if (!user?.company) return [];

    return [{ ...user.company, is_default: user.active_company_id === user.company_id }];
  }
}

export const companyService = new CompanyService();
