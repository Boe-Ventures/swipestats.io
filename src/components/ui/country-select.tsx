// Re-export CountrySelect and related utilities for backward compatibility
export {
  CountrySelect,
  RegionSelect,
  getCountryByCode,
  getAllCountries,
  getCountryCodeByName,
  getRegionsByCountryCode,
  filterCountries,
  filterRegions,
  type Region,
  type CountryRegion,
} from "./form-inputs/CountrySelect";
