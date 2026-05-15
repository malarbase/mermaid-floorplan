export interface ConfigState {
  domain?: string;
  superAdminEmail?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  convexUrl?: string;
  convexSiteUrl?: string;
  authSecret?: string;
}

export interface DeployCheckResult {
  passed: boolean;
  issues: string[];
}

export interface ApiCredentials {
  vercelToken?: string;
  vercelProjectId?: string;
  vercelTeamId?: string;
  googleServiceAccountPath?: string;
  dnsProvider?: 'cloudflare' | 'route53' | 'manual';
  dnsToken?: string;
  dnsZoneId?: string;
}

export interface SetupAllResult {
  envFileUpdated: boolean;
  convexSynced: boolean;
  vercelDomainAdded: boolean;
  vercelEnvVarsSet: boolean;
  googleOAuthUpdated: boolean;
  dnsRecordsCreated: boolean;
  dnsVerified: boolean;
  issues: string[];
}
