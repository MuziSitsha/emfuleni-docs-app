import { useEffect, useState } from 'react';
import api from './api';

export const DEFAULT_BANKING_DETAILS = {
  "bank": "FNB",
  "branchCode": "261550",
  "accountNumber": "63196314074",
  "accountType": "Gold Business Account"
};
export const BANKING_LABELS = {
  bank: 'Bank', branchCode: 'Branch Code', accountNumber: 'Account Number', accountType: 'Account Type',
};
export function bankingLines(settings) {
  return Object.entries(BANKING_LABELS).map(([key, label]) => `${label}: ${settings[key] || ''}`);
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
}
export function bankingMarkup(settings) {
  return `<section style="break-inside:avoid; margin-top:24px"><h3>Banking Details</h3>${bankingLines(settings).map(line => `<div>${escapeHtml(line)}</div>`).join('')}</section>`;
}
export function useCompanySettings() {
  const [settings, setSettings] = useState(DEFAULT_BANKING_DETAILS);
  useEffect(() => {
    let active = true;
    api.get('/company-settings').then(({data}) => {
      if (active) setSettings(data);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  return settings;
}
