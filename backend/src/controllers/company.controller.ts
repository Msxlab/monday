import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { companyService } from '../services/company.service';
import { AuthRequest } from '../types';
import { parseId } from '../utils/parse-id';

const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  logo_url: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

const updateCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  logo_url: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  is_active: z.boolean().optional(),
});

const addUserSchema = z.object({
  userId: z.number().int().positive(),
  isDefault: z.boolean().optional(),
});

export const listCompanies = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = req.query as Record<string, string>;
    const result = await companyService.list({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getCompany = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const company = await companyService.getById(parseId(req.params.id));
    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
};

export const myCompanies = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const companies = await companyService.getUserCompanies(req.user!.userId);
    res.json({ success: true, data: companies });
  } catch (err) {
    next(err);
  }
};

export const createCompany = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createCompanySchema.parse(req.body);
    const company = await companyService.create(data);
    res.status(201).json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
};

export const updateCompany = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateCompanySchema.parse(req.body);
    const company = await companyService.update(parseId(req.params.id), data);
    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
};

export const deleteCompany = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await companyService.delete(parseId(req.params.id));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const addUserToCompany = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, isDefault } = addUserSchema.parse(req.body);
    const result = await companyService.addUser(parseId(req.params.id), userId, isDefault);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const removeUserFromCompany = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await companyService.removeUser(parseId(req.params.id), parseId(req.params.userId));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
