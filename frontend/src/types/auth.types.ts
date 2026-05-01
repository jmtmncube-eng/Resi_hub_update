export type Role = 'ACTIVE_STUDENT' | 'PENDING_STUDENT' | 'ADMIN';

export interface User {
  id:         string;
  email:      string;
  role:       Role;
  name:       string;
  avatarUrl?: string;
  university?: string;
  program?:   string;
  year?:      number;
  phone?:     string;
  bio?:       string;
  onboardedAt?: string | null;
  createdAt:  string;
  updatedAt:  string;
  allocation?: Allocation | null;
  wallet?:    Wallet | null;
}

export interface Allocation {
  id:      string;
  status:  'RESERVED' | 'ACTIVE' | 'ENDED';
  moveIn?: string;
  rent:    number;
  balance: number;
  room:    Room;
}

export interface Room {
  id:     string;
  number: string;
  block:  string;
  type:   'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'QUAD' | 'STUDIO';
  price:  number;
  status: 'VACANT' | 'RESERVED' | 'OCCUPIED';
}

export interface Wallet {
  id:      string;
  credits: number;
}

export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface LoginInput {
  email:    string;
  password: string;
}

export interface RegisterInput {
  name:       string;
  email:      string;
  password:   string;
  university?: string;
  program?:   string;
  year?:      number;
  phone?:     string;
}
