export type CertProvider = 'AWS' | 'Microsoft' | 'Google Cloud' | 'CompTIA' | 'Cisco' | 'PMI' | 'ISC2';

export type CertLevel = 'Foundational' | 'Associate' | 'Professional' | 'Specialty' | 'Expert';

export interface CertDomain {
  name: string;
  weight: number;
  tasks: string[];
}

export interface CertEntry {
  id: string;
  name: string;
  code: string;
  provider: CertProvider;
  level: CertLevel;
  domains: CertDomain[];
}

export const CERT_LEVELS: CertLevel[] = ['Foundational', 'Associate', 'Professional', 'Specialty', 'Expert'];

export const CERT_PROVIDERS: { id: CertProvider; label: string }[] = [
  { id: 'AWS', label: 'Amazon Web Services' },
  { id: 'Microsoft', label: 'Microsoft Azure' },
  { id: 'Google Cloud', label: 'Google Cloud' },
  { id: 'CompTIA', label: 'CompTIA' },
  { id: 'Cisco', label: 'Cisco' },
  { id: 'PMI', label: 'PMI' },
  { id: 'ISC2', label: 'ISC\u00B2' },
];

export function getDomainsAsTrunks(cert: CertEntry): string[] {
  return cert.domains.map(d => d.name);
}

export function getTasksAsObjectives(cert: CertEntry): string[] {
  return cert.domains.flatMap(d =>
    d.tasks.map(t => `[${d.name} - ${d.weight}%] ${t}`)
  );
}

export function getCertsByProvider(certs: CertEntry[], provider: CertProvider): CertEntry[] {
  return certs.filter(c => c.provider === provider);
}

export function getCertsByLevel(certs: CertEntry[], level: CertLevel): CertEntry[] {
  return certs.filter(c => c.level === level);
}

export function getCertById(certs: CertEntry[], id: string): CertEntry | undefined {
  return certs.find(c => c.id === id);
}
