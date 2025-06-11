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
  EXTERNO: 5,
  ASSISTENTE: 4,
  TECNICO: 3,
  COORDENADOR: 2,
  DIRETOR: 1
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
  [Cargo.ASSISTENTE]: '/dashboard-assistente',
  [Cargo.TECNICO]: '/dashboard-tecnico',
  [Cargo.COORDENADOR]: '/dashboard-coordenador',
  [Cargo.DIRETOR]: '/dashboard-diretor'
} as const;