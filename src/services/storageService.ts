import { CompanyProfile } from "../types";

const STORAGE_KEY = 'cerfaflow_company_profile';

export const getCompanyProfile = (): CompanyProfile | null => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Error parsing company profile", e);
    return null;
  }
};

export const saveCompanyProfile = (profile: CompanyProfile): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
};
