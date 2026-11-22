const els = id => document.getElementById(id);
const fmtMoney = n => n < 0 ? '-$' + Math.round(Math.abs(n)).toLocaleString() : '$' + Math.round(n).toLocaleString();
const fmtMoneyK = n => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1000000) return sign + '$' + (abs/1000000).toFixed(2) + 'M';
  if (abs >= 1000) return sign + '$' + Math.round(abs/1000) + 'k';
  return sign + '$' + Math.round(abs);
};
const CHART_COLORS = ['#1f7a6c','#e08c2b','#5a4fcf','#c0392b','#3f9c7c','#8892a0','#c07a1f','#2b6ea3','#a15fc9','#5c8a3f'];

// ---------- Local save-status badge ----------
// "Saving... / Saved locally" indicator on the Settings badge.
function markPlannerLocalDirty() {
  const badge = els('cloudSyncBadge');
  if (badge) badge.dataset.state = 'unsaved';
  const badgeText = els('cloudSyncBadgeText');
  if (badgeText) badgeText.textContent = 'Saving…';
}
function markPlannerLocalSaved() {
  const badge = els('cloudSyncBadge');
  if (badge) badge.dataset.state = 'saved';
  const badgeText = els('cloudSyncBadgeText');
  if (badgeText) badgeText.textContent = 'Saved locally';
}

