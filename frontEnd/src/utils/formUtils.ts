/** Formata uma string para o padrão CPF (XXX.XXX.XXX-XX). */
export const formatCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})$/);
  if (!match) return cpf;
  return [match[1], match[2], match[3]].filter(Boolean).join(".") + (match[4] ? `-${match[4]}` : "");
};

/** Formata uma string para o padrão de telefone ((XX) XXXXX-XXXX). */
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{0,2})(\d{0,5})(\d{0,4})$/);
  if (!match) return phone;
  let formatted = "";
  if (match[1]) formatted += `(${match[1]}`;
  if (match[2]) formatted += `) ${match[2]}`;
  if (match[3]) formatted += `-${match[3]}`;
  return formatted;
};

/** Formata uma string para o padrão CEP (XXXXX-XXX). */
export const formatCEP = (cep: string): string => {
  const cleaned = cep.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{0,5})(\d{0,3})$/);
  if (!match) return cep;
  return match[1] + (match[2] ? `-${match[2]}` : "");
};

/** Remove todos os caracteres não numéricos de uma string. */
export const formatNumericOnly = (value: string): string => {
  return value.replace(/\D/g, "");
};

/** Formata uma string para o padrão UF (duas letras maiúsculas). */
export const formatUF = (value: string): string => {
  return value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2);
};

/** Converte a string para maiúsculas. */
export const formatToUpper = (value: string): string => {
  return value.toUpperCase();
};

/** Remove espaços extras (múltiplos espaços entre palavras) e no início/fim. */
export const cleanExtraSpaces = (text: string): string => {
  return text.trim().replace(/\s\s+/g, ' ');
};


// --- PARSERS ---

/** Converte uma string de moeda para um número. */
export const parseCurrency = (value: string | number): number => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const cleaned = value.replace("R$", "").trim().replace(/\./g, "").replace(",", ".");
  const number = parseFloat(cleaned);
  return isNaN(number) ? 0 : number;
};


// --- VALIDATORS ---

/** Valida um CPF usando o algoritmo de verificação. */
export const isValidCPF = (cpf: string): boolean => {
  const cleaned = formatNumericOnly(cpf);
  if (cleaned.length !== 11 || /^(\d)\1+$/.test(cleaned)) return false;
  let sum = 0, remainder;
  for (let i = 1; i <= 9; i++) sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;
  return true;
};

/** Valida um NIS/PIS usando o algoritmo de verificação. */
export const isValidNIS = (nis: string): boolean => {
  const cleaned = formatNumericOnly(nis);
  if (cleaned.length !== 11) return false;
  const weights = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum = cleaned.slice(0, 10).split('').reduce((acc, digit, index) => acc + parseInt(digit) * weights[index], 0);
  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? 0 : 11 - remainder;
  return parseInt(cleaned.slice(10, 11)) === checkDigit;
};

/** Valida se uma data está no passado ou é o dia de hoje. */
export const isDateInPast = (dateString: string): boolean => {
  if (!dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inputDate = new Date(dateString);
  const userTimezoneOffset = inputDate.getTimezoneOffset() * 60000;
  return new Date(inputDate.getTime() + userTimezoneOffset) <= today;
};

/** Valida um endereço de e-mail usando uma expressão regular. */
export const isValidEmail = (email: string): boolean => {
  if (!email.trim()) return true; // Permite campo vazio
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/** Valida um número de Título de Eleitor. */
export const isValidTituloEleitor = (titulo: string): boolean => {
  const cleaned = formatNumericOnly(titulo);
  if (cleaned.length !== 12) return false;
  const uf = parseInt(cleaned.substring(8, 10), 10);
  if (uf < 1 || uf > 28) return false;
  const weights1 = [2, 3, 4, 5, 6, 7, 8, 9], weights2 = [7, 8, 9];
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += parseInt(cleaned[i]) * weights1[i];
  let dv1 = sum % 11;
  if (dv1 === 10) dv1 = 0;
  sum = 0;
  for (let i = 0; i < 2; i++) sum += parseInt(cleaned[i + 8]) * weights2[i];
  sum += dv1 * weights2[2];
  let dv2 = sum % 11;
  if (dv2 === 10) dv2 = 0;
  return dv1 === parseInt(cleaned[10]) && dv2 === parseInt(cleaned[11]);
};

/** Valida se um nome próprio é razoável. */
export const isValidName = (name: string, requireSurname = false): boolean => {
  const trimmedName = name.trim();
  if (trimmedName.length < 3) return false;
  if (/^\d+$/.test(trimmedName)) return false;
  if (/^(\w)\1+$/.test(trimmedName.replace(/\s/g, ''))) return false;
  if (requireSurname && !trimmedName.includes(' ')) return false;
  return true;
};

/** Valida se um campo de texto contém conteúdo significativo. */
export const isMeaningfulText = (text: string): boolean => {
  const trimmedText = text.trim();
  if (trimmedText.length === 0) return true; // Permite campo vazio
  if (/^(\S)\1{5,}/.test(trimmedText)) return false;
  return true;
};