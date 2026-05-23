export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  barcode: string;
  category: string;
  imageUrl?: string;
  isFavorite: boolean;
  stockThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  discount: number;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  tax: number;
  taxRate: number;
  total: number;
  paid: number;
  change: number;
  timestamp: string;
}

export interface RestockLog {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  timestamp: string;
}

export interface Settings {
  taxRate: number;
  storeName: string;
  taxEnabled: boolean;
}

const now = new Date().toISOString();

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Indomie Goreng', price: 3500, stock: 100, barcode: '8968601000100', category: 'Makanan', isFavorite: true, stockThreshold: 20, createdAt: now, updatedAt: now },
  { id: '2', name: 'Aqua Botol 600ml', price: 4000, stock: 50, barcode: '8992761160350', category: 'Minuman', isFavorite: true, stockThreshold: 10, createdAt: now, updatedAt: now },
  { id: '3', name: 'Teh Botol Sosro 450ml', price: 5000, stock: 40, barcode: '8999777123456', category: 'Minuman', isFavorite: true, stockThreshold: 10, createdAt: now, updatedAt: now },
  { id: '4', name: 'Good Day Cappuccino', price: 3000, stock: 60, barcode: '8886388000100', category: 'Minuman', isFavorite: false, stockThreshold: 15, createdAt: now, updatedAt: now },
  { id: '5', name: 'Chitato Sapi Panggang 40g', price: 8500, stock: 30, barcode: '8996001060350', category: 'Snack', isFavorite: true, stockThreshold: 10, createdAt: now, updatedAt: now },
  { id: '6', name: 'Taro Net BBQ 70g', price: 7000, stock: 25, barcode: '8886388001200', category: 'Snack', isFavorite: false, stockThreshold: 8, createdAt: now, updatedAt: now },
  { id: '7', name: 'Beras Premium 1kg', price: 14000, stock: 20, barcode: '8997113000100', category: 'Sembako', isFavorite: false, stockThreshold: 5, createdAt: now, updatedAt: now },
  { id: '8', name: 'Gula Pasir 1kg', price: 15000, stock: 15, barcode: '8997113000200', category: 'Sembako', isFavorite: false, stockThreshold: 5, createdAt: now, updatedAt: now },
  { id: '9', name: 'Sampoerna Mild 16', price: 25000, stock: 8, barcode: '8992350000100', category: 'Rokok', isFavorite: true, stockThreshold: 5, createdAt: now, updatedAt: now },
  { id: '10', name: 'Indomie Soto Ayam', price: 3500, stock: 80, barcode: '8968601000200', category: 'Makanan', isFavorite: false, stockThreshold: 20, createdAt: now, updatedAt: now },
  { id: '11', name: 'Sprite 1.5L', price: 9000, stock: 24, barcode: '5449000093523', category: 'Minuman', isFavorite: false, stockThreshold: 8, createdAt: now, updatedAt: now },
  { id: '12', name: 'Mie Sedaap Kuah', price: 3000, stock: 3, barcode: '8886388002100', category: 'Makanan', isFavorite: false, stockThreshold: 10, createdAt: now, updatedAt: now },
];

export const getProducts = (): Product[] => {
  try {
    const data = localStorage.getItem('kasir_products');
    if (!data) {
      localStorage.setItem('kasir_products', JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_PRODUCTS;
  }
};

export const setProducts = (products: Product[]) => {
  localStorage.setItem('kasir_products', JSON.stringify(products));
};

export const getTransactions = (): Transaction[] => {
  try {
    const data = localStorage.getItem('kasir_transactions');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const setTransactions = (transactions: Transaction[]) => {
  localStorage.setItem('kasir_transactions', JSON.stringify(transactions));
};

export const getRestockLogs = (): RestockLog[] => {
  try {
    const data = localStorage.getItem('kasir_restock_logs');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const setRestockLogs = (logs: RestockLog[]) => {
  localStorage.setItem('kasir_restock_logs', JSON.stringify(logs));
};

export const getSettings = (): Settings => {
  try {
    const data = localStorage.getItem('kasir_settings');
    return data ? JSON.parse(data) : { taxRate: 0.11, storeName: 'Kasir Warung', taxEnabled: false };
  } catch {
    return { taxRate: 0.11, storeName: 'Kasir Warung', taxEnabled: false };
  }
};

export const setSettings = (settings: Settings) => {
  localStorage.setItem('kasir_settings', JSON.stringify(settings));
};
