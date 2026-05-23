import { CartItem, Settings } from "./storage";

export const calculateTotals = (items: CartItem[], settings: Settings) => {
  const subtotal = items.reduce((sum, item) => {
    const lineTotal = Math.round(item.price * item.qty) - Math.round(item.discount);
    return sum + lineTotal;
  }, 0);
  const discountTotal = items.reduce((sum, item) => sum + Math.round(item.discount), 0);
  const tax = settings.taxEnabled ? Math.round(subtotal * settings.taxRate) : 0;
  const total = subtotal + tax;
  return { subtotal, discountTotal, tax, total };
};

export const formatRupiah = (value: number): string => {
  if (isNaN(value) || value === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
};

export const formatDate = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  } catch {
    return '-';
  }
};

export const formatDateOnly = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return '-';
  }
};

export const generateTransactionId = (existingCount: number): string => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const seq = String(existingCount + 1).padStart(3, '0');
  return `TRX-${yyyy}${mm}${dd}-${seq}`;
};

export const generateBarcode = (): string => {
  const prefix = '8999';
  const body = String(Math.floor(Math.random() * 1000000000)).padStart(9, '0');
  return prefix + body;
};

export const isSameDay = (dateA: string, dateB: Date): boolean => {
  try {
    const a = new Date(dateA);
    return (
      a.getFullYear() === dateB.getFullYear() &&
      a.getMonth() === dateB.getMonth() &&
      a.getDate() === dateB.getDate()
    );
  } catch {
    return false;
  }
};

export const isSameWeek = (dateStr: string, referenceDate: Date): boolean => {
  try {
    const d = new Date(dateStr);
    const startOfWeek = new Date(referenceDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return d >= startOfWeek && d <= endOfWeek;
  } catch {
    return false;
  }
};

export const isSameMonth = (dateStr: string, referenceDate: Date): boolean => {
  try {
    const d = new Date(dateStr);
    return (
      d.getFullYear() === referenceDate.getFullYear() &&
      d.getMonth() === referenceDate.getMonth()
    );
  } catch {
    return false;
  }
};
