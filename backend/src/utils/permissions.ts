import { UserRole } from '@prisma/client';
import prisma from './prisma';

type FieldPermission = 'hidden' | 'view' | 'edit';

interface FieldPermissionMap {
  [fieldName: string]: {
    [role in UserRole]?: FieldPermission;
  };
}

const PROJECT_FIELD_PERMISSIONS: FieldPermissionMap = {
  // Proje Temel Bilgileri
  nj_number:     { super_admin: 'edit', admin: 'edit', senior_designer: 'view', designer: 'view', production: 'view' },
  title:         { super_admin: 'edit', admin: 'edit', senior_designer: 'view', designer: 'view', production: 'view' },
  project_type:  { super_admin: 'edit', admin: 'edit', senior_designer: 'view', designer: 'view', production: 'view' },
  assigned_designer_id: { super_admin: 'edit', admin: 'edit', senior_designer: 'view', designer: 'view', production: 'view' },
  start_date:    { super_admin: 'edit', admin: 'edit', senior_designer: 'view', designer: 'view', production: 'view' },
  deadline:      { super_admin: 'edit', admin: 'edit', senior_designer: 'view', designer: 'view', production: 'view' },
  priority:      { super_admin: 'edit', admin: 'edit', senior_designer: 'view', designer: 'view', production: 'view' },
  status:        { super_admin: 'edit', admin: 'edit', senior_designer: 'edit', designer: 'edit', production: 'view' },
  country_target: { super_admin: 'edit', admin: 'edit', senior_designer: 'view', designer: 'view', production: 'view' },
  notes:         { super_admin: 'edit', admin: 'edit', senior_designer: 'view', designer: 'view', production: 'view' },
  admin_notes:   { super_admin: 'edit', admin: 'edit', senior_designer: 'hidden', designer: 'hidden', production: 'hidden' },

  // Finansal Alanlar (Tasarımcılara Gizli)
  client_budget:   { super_admin: 'edit', admin: 'edit', senior_designer: 'hidden', designer: 'hidden', production: 'hidden' },
  project_price:   { super_admin: 'edit', admin: 'edit', senior_designer: 'hidden', designer: 'hidden', production: 'hidden' },
  cost_price:      { super_admin: 'edit', admin: 'edit', senior_designer: 'hidden', designer: 'hidden', production: 'hidden' },
  profit_margin:   { super_admin: 'edit', admin: 'edit', senior_designer: 'hidden', designer: 'hidden', production: 'hidden' },
  payment_status:  { super_admin: 'edit', admin: 'edit', senior_designer: 'hidden', designer: 'hidden', production: 'hidden' },
  invoice_details: { super_admin: 'edit', admin: 'edit', senior_designer: 'hidden', designer: 'hidden', production: 'hidden' },

  // Müşteri Bilgileri
  client_name:     { super_admin: 'edit', admin: 'edit', senior_designer: 'hidden', designer: 'hidden', production: 'hidden' },
  contact_info:    { super_admin: 'edit', admin: 'edit', senior_designer: 'hidden', designer: 'hidden', production: 'hidden' },
  company_name:    { super_admin: 'edit', admin: 'edit', senior_designer: 'hidden', designer: 'hidden', production: 'hidden' },
  company_details: { super_admin: 'edit', admin: 'edit', senior_designer: 'hidden', designer: 'hidden', production: 'hidden' },

  // Üretim Bilgileri
  order_status:       { super_admin: 'edit', admin: 'edit', senior_designer: 'hidden', designer: 'hidden', production: 'edit' },
  tracking_info:      { super_admin: 'edit', admin: 'edit', senior_designer: 'hidden', designer: 'hidden', production: 'edit' },
  estimated_arrival:  { super_admin: 'edit', admin: 'edit', senior_designer: 'hidden', designer: 'hidden', production: 'edit' },
  actual_arrival:     { super_admin: 'edit', admin: 'edit', senior_designer: 'hidden', designer: 'hidden', production: 'edit' },
};

interface PermissionOverrideCache {
  data: Map<string, { can_view: boolean; can_edit: boolean }>;
  loadedAt: number;
}

interface UserOverrideCache {
  data: Map<number, Map<string, { can_view: boolean; can_edit: boolean }>>;
  loadedAt: number;
}

let overrideCache: PermissionOverrideCache | null = null;
let userOverrideCache: UserOverrideCache | null = null;
const CACHE_TTL_MS = 60_000;

async function loadOverrides(): Promise<Map<string, { can_view: boolean; can_edit: boolean }>> {
  if (overrideCache && Date.now() - overrideCache.loadedAt < CACHE_TTL_MS) {
    return overrideCache.data;
  }
  try {
    const rows = await prisma.permissionOverride.findMany();
    const map = new Map<string, { can_view: boolean; can_edit: boolean }>();
    for (const row of rows) {
      map.set(`${row.role}:${row.resource_type}:${row.field_name}`, {
        can_view: row.can_view,
        can_edit: row.can_edit,
      });
    }
    overrideCache = { data: map, loadedAt: Date.now() };
    return map;
  } catch {
    return overrideCache?.data ?? new Map();
  }
}

async function loadUserOverrides(): Promise<Map<number, Map<string, { can_view: boolean; can_edit: boolean }>>> {
  if (userOverrideCache && Date.now() - userOverrideCache.loadedAt < CACHE_TTL_MS) {
    return userOverrideCache.data;
  }
  try {
    const now = new Date();
    const rows = await prisma.userPermissionOverride.findMany({
      where: {
        OR: [
          { expires_at: null },
          { expires_at: { gt: now } },
        ],
      },
    });
    const map = new Map<number, Map<string, { can_view: boolean; can_edit: boolean }>>();
    for (const row of rows) {
      if (!map.has(row.user_id)) {
        map.set(row.user_id, new Map());
      }
      map.get(row.user_id)!.set(`${row.resource_type}:${row.field_name}`, {
        can_view: row.can_view,
        can_edit: row.can_edit,
      });
    }
    userOverrideCache = { data: map, loadedAt: Date.now() };
    return map;
  } catch {
    return userOverrideCache?.data ?? new Map();
  }
}

export function getFieldPermission(
  fieldName: string,
  role: UserRole
): FieldPermission {
  const fieldDef = PROJECT_FIELD_PERMISSIONS[fieldName];
  if (!fieldDef) return 'hidden';
  return fieldDef[role] || 'hidden';
}

async function getFieldPermissionWithOverrides(
  fieldName: string,
  role: UserRole,
  resourceType: string = 'project'
): Promise<FieldPermission> {
  const overrides = await loadOverrides();
  const key = `${role}:${resourceType}:${fieldName}`;
  const override = overrides.get(key);
  if (override) {
    if (override.can_edit) return 'edit';
    if (override.can_view) return 'view';
    return 'hidden';
  }
  return getFieldPermission(fieldName, role);
}

export function canViewField(fieldName: string, role: UserRole): boolean {
  const perm = getFieldPermission(fieldName, role);
  return perm === 'view' || perm === 'edit';
}

export function canEditField(fieldName: string, role: UserRole): boolean {
  return getFieldPermission(fieldName, role) === 'edit';
}

export function serializeForRole<T extends Record<string, unknown>>(
  data: T,
  role: UserRole,
  fieldPrefix: string = ''
): Partial<T> {
  const result: Partial<T> = {};

  for (const key of Object.keys(data)) {
    const fieldKey = fieldPrefix ? `${fieldPrefix}.${key}` : key;

    if (PROJECT_FIELD_PERMISSIONS[fieldKey] || PROJECT_FIELD_PERMISSIONS[key]) {
      if (canViewField(fieldKey, role) || canViewField(key, role)) {
        (result as Record<string, unknown>)[key] = data[key];
      }
    } else {
      (result as Record<string, unknown>)[key] = data[key];
    }
  }

  return result;
}

export async function filterProjectForRole(
  project: Record<string, unknown>,
  role: UserRole,
  userId?: number
): Promise<Record<string, unknown>> {
  const [roleOverrides, userOverridesMap] = await Promise.all([
    loadOverrides(),
    loadUserOverrides(),
  ]);

  const userOverrides = userId ? (userOverridesMap.get(userId) ?? new Map()) : new Map();

  const resolveAccess = (fieldKey: string): boolean => {
    const userKey = `project:${fieldKey}`;
    if (userOverrides.has(userKey)) {
      const uo = userOverrides.get(userKey)!;
      return uo.can_view || uo.can_edit;
    }
    const roleKey = `${role}:project:${fieldKey}`;
    if (roleOverrides.has(roleKey)) {
      const ro = roleOverrides.get(roleKey)!;
      return ro.can_view || ro.can_edit;
    }
    return canViewField(fieldKey, role);
  };

  const filtered: Record<string, unknown> = {};

  for (const key of Object.keys(project)) {
    if (PROJECT_FIELD_PERMISSIONS[key]) {
      if (resolveAccess(key)) {
        filtered[key] = project[key];
      }
    } else {
      filtered[key] = project[key];
    }
  }

  if (project.financials && typeof project.financials === 'object') {
    const userFinKey = 'project:financials';
    const roleFinKey = `${role}:project:financials`;
    if (userOverrides.has(userFinKey)) {
      const uo = userOverrides.get(userFinKey)!;
      if (uo.can_view || uo.can_edit) { filtered.financials = project.financials; }
      else { delete filtered.financials; }
    } else if (roleOverrides.has(roleFinKey)) {
      const ro = roleOverrides.get(roleFinKey)!;
      if (ro.can_view || ro.can_edit) { filtered.financials = project.financials; }
      else { delete filtered.financials; }
    } else if (role !== 'super_admin' && role !== 'admin') {
      delete filtered.financials;
    }
  }

  if (project.client && typeof project.client === 'object') {
    const userClientKey = 'project:client';
    const roleClientKey = `${role}:project:client`;
    if (userOverrides.has(userClientKey)) {
      const uo = userOverrides.get(userClientKey)!;
      if (uo.can_view || uo.can_edit) { filtered.client = project.client; }
      else { delete filtered.client; }
    } else if (roleOverrides.has(roleClientKey)) {
      const ro = roleOverrides.get(roleClientKey)!;
      if (ro.can_view || ro.can_edit) { filtered.client = project.client; }
      else { delete filtered.client; }
    } else if (role !== 'super_admin' && role !== 'admin') {
      delete filtered.client;
    }
  }

  return filtered;
}

export function clearPermissionCache(): void {
  overrideCache = null;
  userOverrideCache = null;
}
