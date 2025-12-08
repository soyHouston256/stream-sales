export type UserRole = 'admin' | 'provider' | 'seller' | 'affiliate' | 'conciliator' | 'payment_validator';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  image?: string | null;
  username?: string | null;
  phoneNumber?: string | null;
  countryCode?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  referralCode?: string;
  phoneNumber?: string;
  countryCode?: string;
  username?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  wallet?: Wallet;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
