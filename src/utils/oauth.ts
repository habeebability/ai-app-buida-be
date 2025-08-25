import logger from './logger';

export interface OAuthRetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

export const defaultOAuthRetryConfig: OAuthRetryConfig = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  backoffMultiplier: 2,
};

export class OAuthError extends Error {
  public provider: string;
  public code: string;
  public retryable: boolean;

  constructor(message: string, provider: string, code: string, retryable: boolean = false) {
    super(message);
    this.name = 'OAuthError';
    this.provider = provider;
    this.code = code;
    this.retryable = retryable;
  }
}

export const isRetryableOAuthError = (error: any): boolean => {
  const retryableErrors = [
    'network_error',
    'timeout',
    'server_error',
    'temporarily_unavailable',
    'rate_limit_exceeded',
  ];

  return retryableErrors.some(retryableError => 
    error.message?.toLowerCase().includes(retryableError) ||
    error.code?.toLowerCase().includes(retryableError)
  );
};

export const getOAuthErrorMessage = (error: any, provider: string): string => {
  const errorMessage = error.message?.toLowerCase() || '';
  
  if (errorMessage.includes('access_denied')) {
    return `${provider} access was denied. Please try again.`;
  }
  
  if (errorMessage.includes('invalid_grant')) {
    return `${provider} session expired. Please try again.`;
  }
  
  if (errorMessage.includes('invalid_client')) {
    return `${provider} configuration error. Please contact support.`;
  }
  
  if (errorMessage.includes('server_error')) {
    return `${provider} service is currently unavailable. Please try again later.`;
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
    return `Network error connecting to ${provider}. Please check your connection and try again.`;
  }
  
  if (errorMessage.includes('rate_limit')) {
    return `${provider} rate limit exceeded. Please try again later.`;
  }
  
  return `Authentication with ${provider} failed. Please try again.`;
};

export const logOAuthError = (error: any, provider: string, context: any = {}): void => {
  logger.error(`${provider} OAuth error:`, {
    provider,
    error: error.message,
    code: error.code,
    stack: error.stack,
    retryable: isRetryableOAuthError(error),
    context,
  });
};

export const validateOAuthConfig = (provider: string): boolean => {
  const configs = {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  };

  const config = configs[provider as keyof typeof configs];
  if (!config) {
    logger.error(`Unknown OAuth provider: ${provider}`);
    return false;
  }

  const isValid = !!(config.clientId && config.clientSecret);
  
  if (!isValid) {
    logger.warn(`${provider} OAuth not properly configured`, {
      hasClientId: !!config.clientId,
      hasClientSecret: !!config.clientSecret,
    });
  }

  return isValid;
};

export const getOAuthProviderStatus = () => {
  return {
    google: {
      enabled: validateOAuthConfig('google'),
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
    github: {
      enabled: validateOAuthConfig('github'),
      configured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    },
  };
}; 