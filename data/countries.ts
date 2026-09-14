export type Country = {
  code: string;
  name: string;
  region: string;
  supported: boolean;
  planIds: string[];
  notes: string;
};

const allPlanIds = ["1gb", "3gb", "5gb", "10gb", "20gb", "50gb"];

export const countries: Country[] = [
  // North America
  { code: "US", name: "United States", region: "North America", supported: true, planIds: allPlanIds, notes: "" },
  { code: "CA", name: "Canada", region: "North America", supported: true, planIds: allPlanIds, notes: "" },
  { code: "MX", name: "Mexico", region: "North America", supported: true, planIds: allPlanIds, notes: "" },

  // Europe
  { code: "GB", name: "United Kingdom", region: "Europe", supported: true, planIds: allPlanIds, notes: "" },
  { code: "FR", name: "France", region: "Europe", supported: true, planIds: allPlanIds, notes: "" },
  { code: "DE", name: "Germany", region: "Europe", supported: true, planIds: allPlanIds, notes: "" },
  { code: "IT", name: "Italy", region: "Europe", supported: true, planIds: allPlanIds, notes: "" },
  { code: "ES", name: "Spain", region: "Europe", supported: true, planIds: allPlanIds, notes: "" },
  { code: "NL", name: "Netherlands", region: "Europe", supported: true, planIds: allPlanIds, notes: "" },
  { code: "PT", name: "Portugal", region: "Europe", supported: true, planIds: allPlanIds, notes: "" },
  { code: "CH", name: "Switzerland", region: "Europe", supported: true, planIds: allPlanIds, notes: "" },
  { code: "AT", name: "Austria", region: "Europe", supported: true, planIds: allPlanIds, notes: "" },
  { code: "BE", name: "Belgium", region: "Europe", supported: true, planIds: allPlanIds, notes: "" },
  { code: "GR", name: "Greece", region: "Europe", supported: true, planIds: allPlanIds, notes: "" },
  { code: "IE", name: "Ireland", region: "Europe", supported: true, planIds: allPlanIds, notes: "" },
  { code: "SE", name: "Sweden", region: "Europe", supported: true, planIds: allPlanIds, notes: "" },
  { code: "NO", name: "Norway", region: "Europe", supported: true, planIds: allPlanIds, notes: "" },
  { code: "DK", name: "Denmark", region: "Europe", supported: true, planIds: allPlanIds, notes: "" },
  { code: "FI", name: "Finland", region: "Europe", supported: true, planIds: allPlanIds, notes: "" },
  { code: "PL", name: "Poland", region: "Europe", supported: true, planIds: allPlanIds, notes: "" },
  { code: "CZ", name: "Czech Republic", region: "Europe", supported: true, planIds: allPlanIds, notes: "" },
  { code: "TR", name: "Turkey", region: "Europe", supported: true, planIds: allPlanIds, notes: "" },

  // Middle East
  { code: "AE", name: "United Arab Emirates", region: "Middle East", supported: true, planIds: allPlanIds, notes: "" },
  { code: "SA", name: "Saudi Arabia", region: "Middle East", supported: true, planIds: allPlanIds, notes: "" },
  { code: "QA", name: "Qatar", region: "Middle East", supported: true, planIds: allPlanIds, notes: "" },
  { code: "OM", name: "Oman", region: "Middle East", supported: true, planIds: allPlanIds, notes: "" },
  { code: "KW", name: "Kuwait", region: "Middle East", supported: true, planIds: allPlanIds, notes: "" },
  { code: "BH", name: "Bahrain", region: "Middle East", supported: true, planIds: allPlanIds, notes: "" },

  // South Asia
  { code: "PK", name: "Pakistan", region: "South Asia", supported: true, planIds: allPlanIds, notes: "Local coverage for non-PTA / roaming devices." },
  { code: "IN", name: "India", region: "South Asia", supported: true, planIds: allPlanIds, notes: "" },
  { code: "BD", name: "Bangladesh", region: "South Asia", supported: true, planIds: allPlanIds, notes: "" },
  { code: "LK", name: "Sri Lanka", region: "South Asia", supported: true, planIds: allPlanIds, notes: "" },
  { code: "NP", name: "Nepal", region: "South Asia", supported: true, planIds: allPlanIds, notes: "" },

  // Southeast & East Asia
  { code: "TH", name: "Thailand", region: "Southeast Asia", supported: true, planIds: allPlanIds, notes: "" },
  { code: "MY", name: "Malaysia", region: "Southeast Asia", supported: true, planIds: allPlanIds, notes: "" },
  { code: "SG", name: "Singapore", region: "Southeast Asia", supported: true, planIds: allPlanIds, notes: "" },
  { code: "ID", name: "Indonesia", region: "Southeast Asia", supported: true, planIds: allPlanIds, notes: "" },
  { code: "PH", name: "Philippines", region: "Southeast Asia", supported: true, planIds: allPlanIds, notes: "" },
  { code: "VN", name: "Vietnam", region: "Southeast Asia", supported: true, planIds: allPlanIds, notes: "" },
  { code: "JP", name: "Japan", region: "East Asia", supported: true, planIds: allPlanIds, notes: "" },
  { code: "KR", name: "South Korea", region: "East Asia", supported: true, planIds: allPlanIds, notes: "" },
  { code: "CN", name: "China", region: "East Asia", supported: true, planIds: allPlanIds, notes: "" },
  { code: "HK", name: "Hong Kong", region: "East Asia", supported: true, planIds: allPlanIds, notes: "" },

  // Oceania
  { code: "AU", name: "Australia", region: "Oceania", supported: true, planIds: allPlanIds, notes: "" },
  { code: "NZ", name: "New Zealand", region: "Oceania", supported: true, planIds: allPlanIds, notes: "" },
];
