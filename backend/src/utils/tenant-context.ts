import { AsyncLocalStorage } from 'node:async_hooks';

interface TenantStore {
  companyId: number | null;
}

const storage = new AsyncLocalStorage<TenantStore>();

export function runWithTenantContext<T>(callback: () => T): T {
  return storage.run({ companyId: null }, callback);
}

export function setTenantCompanyId(companyId: number | null): void {
  const store = storage.getStore();
  if (!store) return;
  store.companyId = companyId;
}

export function getTenantCompanyId(): number | null {
  return storage.getStore()?.companyId ?? null;
}
