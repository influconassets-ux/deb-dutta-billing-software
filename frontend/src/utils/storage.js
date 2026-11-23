const API_URL = import.meta.env.VITE_API_URL;

// Helper to get token
const getToken = () => localStorage.getItem('token');

// Helper to handle API responses, including 401s
const handleResponse = async (res) => {
  if (res.status === 401) {
    localStorage.removeItem('token');
    sessionStorage.removeItem('ledgerUnlocked');
    sessionStorage.removeItem('settingsUnlocked');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'API Error');
  }
  return res;
};

// Helper to get headers
const getHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Auth Functions
export const loginUser = async (credentials) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Login failed');
  }
  const data = await res.json();
  localStorage.setItem('token', data.token);
  return data;
};

export const registerUser = async (credentials) => {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Registration failed');
  }
  const data = await res.json();
  localStorage.setItem('token', data.token);
  return data;
};

export const logoutUser = () => {
  localStorage.removeItem('token');
  sessionStorage.removeItem('ledgerUnlocked');
  sessionStorage.removeItem('settingsUnlocked');
  window.location.href = '/login';
};

export const resetPassword = async (email, idToken, newPassword, target = 'account') => {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, idToken, newPassword, target })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Password reset failed');
  }
  return await res.json();
};

export const verifyPassword = async (password) => {
  const res = await fetch(`${API_URL}/auth/verify-password`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ password })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Verification failed');
  }
  return await res.json();
};

export const verifyLedgerPassword = async (password) => {
  const res = await fetch(`${API_URL}/auth/verify-ledger-password`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ password })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Verification failed');
  }
  return await res.json();
};

export const getLedgerPasswordStatus = async () => {
  const res = await fetch(`${API_URL}/auth/ledger-password-status`, { headers: getHeaders() });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to check ledger password status');
  }
  return await res.json();
};

export const verifyEditPin = async (pin) => {
  const res = await fetch(`${API_URL}/auth/verify-edit-pin`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ pin })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Verification failed');
  }
  return await res.json();
};

export const getEditPinStatus = async () => {
  const res = await fetch(`${API_URL}/auth/edit-pin-status`, { headers: getHeaders() });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to check edit PIN status');
  }
  return await res.json();
};

export const defaultSettings = {
  advocateName: 'Rhiddhiman Mukherjee',
  designation: 'Advocate',
  court: 'High Court at Calcutta',
  briefedBy: 'Mr. Rowsan Kumar Jha',
  bankName: 'STATE BANK OF INDIA',
  branch: 'High Court Spl. Branch',
  accountNo: '3756852410',
  ifsc: 'SBIN000084',
  micr: '700002100',
  pan: 'BWMPM155K',
  clerkName: 'Subhendu Mal',
  clerkDesignation: 'Clerk to',
  clerkAdvocate: 'Rhiddhiman Mukherjee',
  clerkCourt: 'High Court at Calcutta',
  clerkPhone: '70447 79122',
  clerkBankName: 'INDIAN BANK',
  clerkBranch: 'MADHUSUDANPUR BRANCH, HOOGLY',
  clerkAccountNo: '50518782873',
  clerkIfsc: 'IDIB000M528',
  clerkMicr: '700019216',
  clerkPan: 'DBMPM1314R',
  residence: '123/A, Example Street, Kolkata - 700001',
  phone: '+91 9876543210',
  email: 'advocate@example.com',
  forgotPasswordPhone: '+919339919973'
};

// Admin Settings
export const getCachedSettings = () => {
  const cached = localStorage.getItem('cachedSettings');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.error('Failed to parse cached settings');
    }
  }
  return defaultSettings;
};

export const getSettings = async () => {
  try {
    const res = await fetch(`${API_URL}/settings`, { headers: getHeaders() });
    await handleResponse(res);
    const data = await res.json();
    localStorage.setItem('cachedSettings', JSON.stringify(data));
    return data;
  } catch (err) {
    console.error('Failed to fetch settings:', err);
  }
  return getCachedSettings();
};

export const saveSettings = async (settings) => {
  try {
    const res = await fetch(`${API_URL}/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(settings)
    });
    await handleResponse(res);
    const data = await res.json();
    localStorage.setItem('cachedSettings', JSON.stringify(data));
    return data;
  } catch (err) {
    console.error('Failed to save settings:', err);
    throw err;
  }
};

// Ledger (Saved Bills)
let memoryLedger = null;

export const getCachedLedgerTimestamp = () => {
  return localStorage.getItem('cachedLedger_updated_at') || null;
};

export const setCachedLedger = (data) => {
  memoryLedger = Array.isArray(data) ? data : [];
  try {
    localStorage.setItem('cachedLedger', JSON.stringify(memoryLedger));
    localStorage.setItem('cachedLedger_updated_at', new Date().toISOString());
  } catch (e) {
    console.warn('Failed to cache ledger in localStorage:', e);
  }
  return memoryLedger;
};

export const getCachedLedger = () => {
  if (memoryLedger && Array.isArray(memoryLedger) && memoryLedger.length > 0) {
    return memoryLedger;
  }
  const cached = localStorage.getItem('cachedLedger');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        memoryLedger = parsed;
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse cached ledger', e);
    }
  }
  return [];
};

export const getLedger = async () => {
  try {
    const res = await fetch(`${API_URL}/bills`, { headers: getHeaders() });
    await handleResponse(res);
    const data = await res.json();
    setCachedLedger(data);
    return data;
  } catch (err) {
    console.error('Failed to fetch ledger:', err);
  }
  return getCachedLedger();
};

export const saveBillToLedger = async (bill) => {
  try {
    const res = await fetch(`${API_URL}/bills`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(bill)
    });
    await handleResponse(res);
    const saved = await res.json();
    const current = getCachedLedger();
    setCachedLedger([saved, ...current.filter(b => (b._id || b.id) !== (saved._id || saved.id))]);
    return saved;
  } catch (err) {
    console.error('Failed to save bill:', err);
    throw err;
  }
};

export const updateBillInLedger = async (updatedBill) => {
  try {
    const id = updatedBill._id || updatedBill.id;
    if (!id) {
      throw new Error('Cannot update bill: Missing bill ID');
    }

    // Defensive cleanup of payload before transmission
    const payload = { ...updatedBill };
    if (Array.isArray(payload.items)) {
      payload.items = payload.items.map(item => {
        let fees = item.fees;
        const feesIsNil = typeof fees === 'string' && fees.trim().toLowerCase() === 'nil';
        if (feesIsNil) {
          fees = 'NIL'; // keep the marker; the server stores it as 0 and flags gm as NIL
        } else if (fees !== undefined && fees !== null && fees !== '') {
          fees = Number(String(fees).replace(/,/g, '').trim());
          if (isNaN(fees)) fees = 0;
        } else {
          fees = 0;
        }
        return {
          ...item, // keep every other item field, e.g. admin-only actualGm / actualFees
          nature: item.nature || '',
          gm: item.gm || '',
          fees,
          itemType: item.itemType === 'remarks' ? 'remarks' : 'item'
        };
      });
    }

    const res = await fetch(`${API_URL}/bills/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    await handleResponse(res);
    const saved = await res.json();
    const current = getCachedLedger();
    const updatedList = current.map(b => ((b._id || b.id) === (saved._id || saved.id) ? saved : b));
    setCachedLedger(updatedList);
    return saved;
  } catch (err) {
    console.error('Failed to update bill:', err);
    throw err;
  }
};

export const deleteBill = async (id) => {
  try {
    const res = await fetch(`${API_URL}/bills/${id}`, { method: 'DELETE', headers: getHeaders() });
    await handleResponse(res);
    const current = getCachedLedger();
    setCachedLedger(current.filter(b => (b._id || b.id) !== id));
  } catch (err) {
    console.error('Failed to delete bill:', err);
    throw err;
  }
};

export const clearLedger = async () => {
  try {
    const res = await fetch(`${API_URL}/bills`, { method: 'DELETE', headers: getHeaders() });
    await handleResponse(res);
    setCachedLedger([]);
    return [];
  } catch (err) {
    console.error('Failed to clear ledger:', err);
    return [];
  }
};

// Rough Bills
export const getCachedRoughBills = () => {
  const cached = localStorage.getItem('cachedRoughBills');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.error('Failed to parse cached rough bills');
    }
  }
  return [];
};

export const getRoughBills = async () => {
  try {
    const res = await fetch(`${API_URL}/rough-bills`, { headers: getHeaders() });
    await handleResponse(res);
    const data = await res.json();
    localStorage.setItem('cachedRoughBills', JSON.stringify(data));
    return data;
  } catch (err) {
    console.error('Failed to fetch rough bills:', err);
  }
  return getCachedRoughBills();
};

export const saveRoughBill = async (bill) => {
  try {
    const res = await fetch(`${API_URL}/rough-bills`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(bill)
    });
    await handleResponse(res);
    return await res.json();
  } catch (err) {
    console.error('Failed to save rough bill:', err);
    throw err;
  }
};

export const updateRoughBill = async (updatedBill) => {
  try {
    const res = await fetch(`${API_URL}/rough-bills/${updatedBill._id || updatedBill.id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updatedBill)
    });
    await handleResponse(res);
    return await res.json();
  } catch (err) {
    console.error('Failed to update rough bill:', err);
    throw err;
  }
};

export const deleteRoughBill = async (id) => {
  try {
    const res = await fetch(`${API_URL}/rough-bills/${id}`, { method: 'DELETE', headers: getHeaders() });
    await handleResponse(res);
  } catch (err) {
    console.error('Failed to delete rough bill:', err);
    throw err;
  }
};

// Clients Directory
export const getClients = async () => {
  try {
    const res = await fetch(`${API_URL}/clients`, { headers: getHeaders() });
    await handleResponse(res);
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch clients:', err);
    return [];
  }
};

export const generateMemoNo = async (date) => {
  try {
    const res = await fetch(`${API_URL}/bills/generate-memo?date=${date}`, { headers: getHeaders() });
    await handleResponse(res);
    const data = await res.json();
    return data.memoNo;
  } catch (err) {
    console.error('Failed to generate memo no', err);
    return null;
  }
};

export const saveClient = async (client) => {
  try {
    const res = await fetch(`${API_URL}/clients`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(client)
    });
    await handleResponse(res);
    return await res.json();
  } catch (err) {
    console.error('Failed to save client:', err);
    throw err;
  }
};

export const deleteClient = async (id) => {
  try {
    const res = await fetch(`${API_URL}/clients/${id}`, { method: 'DELETE', headers: getHeaders() });
    await handleResponse(res);
  } catch (err) {
    console.error('Failed to delete client:', err);
    throw err;
  }
};

export const clearAllClients = async () => {
  try {
    const res = await fetch(`${API_URL}/clients`, { method: 'DELETE', headers: getHeaders() });
    await handleResponse(res);
    return [];
  } catch (err) {
    console.error('Failed to clear clients:', err);
    return [];
  }
};
