import { AsyncLocalStorage } from 'node:async_hooks';

interface TenantStore {
  companyId?: number;
}

const storage = new AsyncLocalStorage<TenantStore>();

export function runWithTenantContext<T>(callback: () => T): T {
  return storage.run({}, callback);
}

export function setTenantCompanyId(companyId?: number): void {
  const store = storage.getStore();
  if (!store) return;
  store.companyId = companyId;
}

export function getTenantCompanyId(): number | undefined {
  return storage.getStore()?.companyId;
}
