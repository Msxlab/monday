import { create } from "zustand"

interface Company {
  id: string
  name: string
  logo?: string
}

interface CompanyState {
  companies: Company[]
  selectedCompany: Company | null
  setCompanies: (companies: Company[]) => void
  selectCompany: (company: Company) => void
}

export const useCompanyStore = create<CompanyState>((set) => ({
  companies: [],
  selectedCompany: null,

  setCompanies: (companies: Company[]) => set({ companies }),

  selectCompany: (company: Company) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedCompanyId", company.id)
    }
    set({ selectedCompany: company })
  },
}))
