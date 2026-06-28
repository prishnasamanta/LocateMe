const DEVICE_ID_KEY = 'locateme_device_id';

export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getDefaultDeviceLabel() {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Macintosh/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows';
  return 'This device';
}

const DEVICE_LABEL_KEY = 'locateme_device_label';
const ACCOUNT_ROLE_KEY = 'locateme_account_role';

export function getAccountRole() {
  return localStorage.getItem(ACCOUNT_ROLE_KEY);
}

export function setAccountRole(role) {
  if (role) localStorage.setItem(ACCOUNT_ROLE_KEY, role);
  else localStorage.removeItem(ACCOUNT_ROLE_KEY);
}

export function isJoinerAccount() {
  return getAccountRole() === 'joiner';
}

export function getDeviceLabel() {
  return localStorage.getItem(DEVICE_LABEL_KEY) || getDefaultDeviceLabel();
}

export function setDeviceLabel(label) {
  localStorage.setItem(DEVICE_LABEL_KEY, label.trim() || getDefaultDeviceLabel());
}

const VISITOR_NAME_KEY = 'locateme_visitor_display_name';

export function getVisitorDisplayName() {
  return localStorage.getItem(VISITOR_NAME_KEY) || getDeviceLabel();
}

export function setVisitorDisplayName(name) {
  localStorage.setItem(VISITOR_NAME_KEY, name.trim() || getDeviceLabel());
}
