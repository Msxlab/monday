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
  companies: [
    { id: "1", name: "Şirket A" },
    { id: "2", name: "Şirket B" },
    { id: "3", name: "Şirket C" },
  ],
  selectedCompany: { id: "1", name: "Şirket A" },

  setCompanies: (companies: Company[]) => set({ companies }),

  selectCompany: (company: Company) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedCompanyId", company.id)
    }
    set({ selectedCompany: company })
  },
}))
