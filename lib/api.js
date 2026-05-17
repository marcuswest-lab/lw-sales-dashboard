// Apps Script Web App URL. Same one you deployed.
export const API_URL =
  'https://script.google.com/macros/s/AKfycbw0kQl0RYmT-YiRhLWUrFBUa8G6gbyQQq9LafVImfIjAxUjoMLMAqM3zWB_zEuT97o-/exec';

export async function fetchDashboard() {
  const res = await fetch(API_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}
