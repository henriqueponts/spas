// src/types/index.ts
export interface User {
  id: number;
  nome: string;
  cargo_id: number;
  cargo_nome?: string;
  equipamento_id: number;
  equipamento_nome?: string;
}

export interface LoginCredentials {
  cpf: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
  usuario?: User;
}

export const Cargo = {
  
  DIRETOR: 1,
  COORDENADOR: 2,
  TECNICO: 3,
  ASSISTENTE: 4,
  EXTERNO: 5

} as const;

export const CargoNames = {
  [Cargo.EXTERNO]: 'EXTERNO',
  [Cargo.ASSISTENTE]: 'ASSISTENTE',
  [Cargo.TECNICO]: 'TECNICO',
  [Cargo.COORDENADOR]: 'COORDENADOR',
  [Cargo.DIRETOR]: 'DIRETOR'
} as const;

export const CargoRoutes = {
  [Cargo.EXTERNO]: '/beneficios',
  [Cargo.ASSISTENTE]: '/home',
  [Cargo.TECNICO]: '/home',
  [Cargo.COORDENADOR]: '/home',
  [Cargo.DIRETOR]: '/home'
} as const;