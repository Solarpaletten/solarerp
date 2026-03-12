// lib/onboarding/templateResolver.ts
// ═══════════════════════════════════════════════════════════════
// TASK 58 — Template Resolver
// Determines which accounting template to use based on company params
// Resolution order: exact → country+vat → country → GLOBAL_DEFAULT
// ═══════════════════════════════════════════════════════════════

export type TemplateKey =
  | 'LT_UAB_VAT'
  | 'LT_UAB_NO_VAT'
  | 'LT_MB_VAT'
  | 'DE_GMBH_VAT'
  | 'DE_GMBH_NO_VAT'
  | 'PL_SPZOO_VAT'
  | 'EE_OU_VAT'
  | 'LV_SIA_VAT'
  | 'US_LLC_NO_VAT'
  | 'GLOBAL_DEFAULT';

interface ResolveParams {
  country: string;      // ISO 2-letter: LT, DE, PL, EE, LV, US…
  legalType: string;    // UAB, GmbH, LLC, OÜ, SIA, MB, Sp. z o.o.…
  vatPayer: boolean;
}

// Country → base currency
export const COUNTRY_CURRENCY: Record<string, string> = {
  LT: 'EUR', LV: 'EUR', EE: 'EUR',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
  PL: 'PLN', CZ: 'CZK', HU: 'HUF',
  GB: 'GBP', US: 'USD', CA: 'CAD',
  UA: 'UAH', BY: 'BYN', RU: 'RUB',
};

// Country → default legal types list (for UI dropdown)
export const COUNTRY_LEGAL_TYPES: Record<string, string[]> = {
  LT: ['UAB', 'MB', 'AB', 'IV', 'VšĮ'],
  LV: ['SIA', 'AS', 'IK'],
  EE: ['OÜ', 'AS'],
  DE: ['GmbH', 'AG', 'UG', 'Einzelunternehmen'],
  PL: ['Sp. z o.o.', 'SA', 'JDG'],
  US: ['LLC', 'Inc', 'Corp', 'Sole Proprietor'],
  GB: ['Ltd', 'PLC', 'LLP'],
  FR: ['SAS', 'SARL', 'SA'],
  DEFAULT: ['LLC', 'Ltd', 'Other'],
};

export function getCurrencyForCountry(country: string): string {
  return COUNTRY_CURRENCY[country.toUpperCase()] ?? 'EUR';
}

export function getLegalTypesForCountry(country: string): string[] {
  return COUNTRY_LEGAL_TYPES[country.toUpperCase()] ?? COUNTRY_LEGAL_TYPES['DEFAULT'];
}

// ─── Main resolution logic ───────────────────────────────────
export function resolveTemplateKey(params: ResolveParams): TemplateKey {
  const country = params.country.toUpperCase();
  const legalType = params.legalType.toUpperCase().replace(/[\s.]/g, '');
  const vat = params.vatPayer;

  // Level 1: Exact match
  const exactKey = `${country}_${legalType}_${vat ? 'VAT' : 'NO_VAT'}` as TemplateKey;
  if (TEMPLATE_REGISTRY[exactKey]) return exactKey;

  // Level 2: Country + vatMode (ignore legalType)
  const countryVatKey = `${country}_${vat ? 'VAT' : 'NO_VAT'}` as TemplateKey;
  if (TEMPLATE_REGISTRY[countryVatKey as TemplateKey]) return countryVatKey as TemplateKey;

  // Level 3: Country + most common legalType
  const countryDefaultKeys = Object.keys(TEMPLATE_REGISTRY).filter(
    k => k.startsWith(country + '_') && k.endsWith(vat ? '_VAT' : '_NO_VAT')
  );
  if (countryDefaultKeys.length > 0) return countryDefaultKeys[0] as TemplateKey;

  // Level 4: Global fallback
  console.log(`[TemplateResolver] No template for ${country}/${legalType}/vatPayer=${vat} → GLOBAL_DEFAULT`);
  return 'GLOBAL_DEFAULT';
}

// ─── Registry ────────────────────────────────────────────────
// Maps TemplateKey → whether it's registered
// Actual data is in the template files
const TEMPLATE_REGISTRY: Partial<Record<TemplateKey, true>> = {
  LT_UAB_VAT:    true,
  LT_UAB_NO_VAT: true,
  LT_MB_VAT:     true,
  DE_GMBH_VAT:   true,
  LV_SIA_VAT:    true,
  EE_OU_VAT:     true,
  GLOBAL_DEFAULT: true,
};
