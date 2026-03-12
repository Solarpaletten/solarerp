'use client';
// app/(auth)/onboarding/page.tsx  OR  app/account/onboarding/page.tsx
// ═══════════════════════════════════════════════════════════════
// TASK 58 — Company Onboarding UI
// Short form: company name, country, legal type, VAT checkbox
// Shows animated progress during bootstrap initialization
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Country → legal types data (mirrors templateResolver)
const COUNTRY_DATA: Record<string, { currency: string; legalTypes: string[] }> = {
  LT: { currency: 'EUR', legalTypes: ['UAB', 'MB', 'AB', 'IV', 'VšĮ'] },
  LV: { currency: 'EUR', legalTypes: ['SIA', 'AS', 'IK'] },
  EE: { currency: 'EUR', legalTypes: ['OÜ', 'AS'] },
  DE: { currency: 'EUR', legalTypes: ['GmbH', 'AG', 'UG', 'Einzelunternehmen'] },
  PL: { currency: 'PLN', legalTypes: ['Sp. z o.o.', 'SA', 'JDG'] },
  US: { currency: 'USD', legalTypes: ['LLC', 'Inc', 'Corp', 'Sole Proprietor'] },
  GB: { currency: 'GBP', legalTypes: ['Ltd', 'PLC', 'LLP'] },
  FR: { currency: 'EUR', legalTypes: ['SAS', 'SARL', 'SA'] },
  NL: { currency: 'EUR', legalTypes: ['BV', 'NV'] },
  OTHER: { currency: 'EUR', legalTypes: ['LLC', 'Ltd', 'Other'] },
};

const COUNTRIES = [
  { code: 'LT', name: 'Lithuania' },
  { code: 'LV', name: 'Latvia' },
  { code: 'EE', name: 'Estonia' },
  { code: 'DE', name: 'Germany' },
  { code: 'PL', name: 'Poland' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'OTHER', name: 'Other country' },
];

const BOOTSTRAP_STEPS = [
  'Creating your accounting environment...',
  'Applying template...',
  'Creating chart of accounts...',
  'Creating tax (VAT) settings...',
  'Creating warehouses...',
  'Creating clients and counterparties...',
  'Creating demo products and services...',
  'Finalizing workspace...',
];

type Phase = 'form' | 'loading' | 'done' | 'error';

export default function OnboardingPage() {
  const router = useRouter();

  // ── Form state ────────────────────────────────────────────
  const [companyName, setCompanyName] = useState('');
  const [country, setCountry] = useState('');
  const [legalType, setLegalType] = useState('');
  const [vatPayer, setVatPayer] = useState(true);

  // ── Derived ───────────────────────────────────────────────
  const countryData = country ? COUNTRY_DATA[country] ?? COUNTRY_DATA['OTHER'] : null;
  const legalTypes = countryData?.legalTypes ?? [];
  const currency = countryData?.currency ?? '';

  // When country changes, reset legalType and auto-select first
  useEffect(() => {
    if (legalTypes.length > 0) setLegalType(legalTypes[0]);
    else setLegalType('');
  }, [country]);

  // ── Loading state ─────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('form');
  const [currentStep, setCurrentStep] = useState(0);
  const [createdCompanyId, setCreatedCompanyId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ── Form validation ───────────────────────────────────────
  const isValid = companyName.trim().length >= 2 && country && legalType;

  // ── Submit ────────────────────────────────────────────────
  async function handleSubmit() {
    if (!isValid) return;

    setPhase('loading');
    setCurrentStep(0);

    // Animate steps while waiting for API
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => Math.min(prev + 1, BOOTSTRAP_STEPS.length - 1));
    }, 800);

    try {
      const res = await fetch('/api/account/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: companyName.trim(), country, legalType, vatPayer }),
      });

      clearInterval(stepInterval);

      if (res.status === 201) {
        const json = await res.json();
        setCreatedCompanyId(json.data.companyId);
        setCurrentStep(BOOTSTRAP_STEPS.length - 1);
        setPhase('done');
      } else {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `HTTP ${res.status}`);
      }
    } catch (err) {
      clearInterval(stepInterval);
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
      setPhase('error');
    }
  }

  function handleProceed() {
    if (createdCompanyId) {
      router.push(`/company/${createdCompanyId}/dashboard`);
    }
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl block mb-2">☀️</span>
          <h1 className="text-2xl font-bold text-gray-900">Solar ERP</h1>
          <p className="text-sm text-gray-500 mt-1">Let's set up your company</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">

          {/* ── FORM PHASE ── */}
          {phase === 'form' && (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-5">Create your company</h2>

              {/* Company Name */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Company name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="UAB My Company"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Country */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select country...</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Legal Type + Currency (auto) */}
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Legal type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={legalType}
                    onChange={e => setLegalType(e.target.value)}
                    disabled={!country}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    {legalTypes.map(lt => <option key={lt} value={lt}>{lt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Base currency</label>
                  <div className="w-full px-3 py-2.5 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-500">
                    {currency || '—'}
                    {currency && <span className="ml-1 text-xs text-gray-400">(auto)</span>}
                  </div>
                </div>
              </div>

              {/* VAT Payer */}
              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vatPayer}
                    onChange={e => setVatPayer(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Company is a VAT payer</span>
                </label>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!isValid}
                className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Create Company
              </button>

              <p className="text-center text-xs text-gray-400 mt-3">
                No phone required · You can edit all details later
              </p>
            </>
          )}

          {/* ── LOADING PHASE ── */}
          {phase === 'loading' && (
            <div className="py-6 text-center">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-700 mb-4">Setting up your workspace...</p>
              <div className="space-y-2">
                {BOOTSTRAP_STEPS.map((step, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-xs transition-all duration-300 ${
                      i <= currentStep ? 'text-gray-700' : 'text-gray-300'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full flex-shrink-0 ${
                      i < currentStep ? 'bg-green-500' :
                      i === currentStep ? 'bg-blue-500 animate-pulse' :
                      'bg-gray-200'
                    }`} />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── DONE PHASE ── */}
          {phase === 'done' && (
            <div className="py-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-800 mb-1">Company created successfully!</p>
              <p className="text-sm text-gray-500 mb-6">Your accounting environment is ready.</p>
              <button
                onClick={handleProceed}
                className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                → Proceed to Dashboard
              </button>
            </div>
          )}

          {/* ── ERROR PHASE ── */}
          {phase === 'error' && (
            <div className="py-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <p className="text-sm font-medium text-gray-800 mb-2">Something went wrong</p>
              <p className="text-xs text-gray-500 mb-6">{errorMsg}</p>
              <button
                onClick={() => setPhase('form')}
                className="w-full py-2.5 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
