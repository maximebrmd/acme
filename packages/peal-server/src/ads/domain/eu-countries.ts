/**
 * The member states of the European Union, where the Digital Services Act
 * has an ad name who benefits from it and who pays for it: an ad set that
 * targets one of them carries both, or the network refuses it. Kept wider
 * rather than narrower: the outermost regions and associated territories
 * with a country code of their own are listed too.
 */
export const euCountries: ReadonlySet<string> = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  // Outermost regions and territories tied to a member state.
  "GF",
  "GP",
  "MQ",
  "YT",
  "RE",
  "MF",
  "AX",
]);
