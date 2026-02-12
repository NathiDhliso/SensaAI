export type { CertProvider, CertLevel, CertDomain, CertEntry } from './types';
export { CERT_LEVELS, CERT_PROVIDERS, getDomainsAsTrunks, getTasksAsObjectives, getCertsByProvider, getCertsByLevel, getCertById } from './types';

import { AWS_CERTS } from './aws';
import { MICROSOFT_CERTS } from './microsoft';
import { GOOGLE_CLOUD_CERTS } from './google-cloud';
import { COMPTIA_CERTS } from './comptia';
import { CISCO_CERTS } from './cisco';
import { PMI_CERTS } from './pmi';
import { ISC2_CERTS } from './isc2';

export { AWS_CERTS } from './aws';
export { MICROSOFT_CERTS } from './microsoft';
export { GOOGLE_CLOUD_CERTS } from './google-cloud';
export { COMPTIA_CERTS } from './comptia';
export { CISCO_CERTS } from './cisco';
export { PMI_CERTS } from './pmi';
export { ISC2_CERTS } from './isc2';

export const ALL_CERTS = [
  ...AWS_CERTS,
  ...MICROSOFT_CERTS,
  ...GOOGLE_CLOUD_CERTS,
  ...COMPTIA_CERTS,
  ...CISCO_CERTS,
  ...PMI_CERTS,
  ...ISC2_CERTS,
];
