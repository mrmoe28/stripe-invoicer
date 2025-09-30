/**
 * Email helper utilities to ensure correct URLs and configuration
 */

/**
 * Get the application base URL for use in emails
 * Prioritizes NEXT_PUBLIC_APP_URL, falls back to APP_BASE_URL
 * Never returns localhost in production
 */
export function getEmailBaseUrl(): string {
  // In production, always use the production URL
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_APP_URL || 
           process.env.APP_BASE_URL || 
           'https://ledgerflow.org';
  }
  
  // In development, allow localhost for testing
  return process.env.NEXT_PUBLIC_APP_URL || 
         process.env.APP_BASE_URL || 
         'http://localhost:3000';
}

/**
 * Get the sender email address
 * Uses subdomain in production for better deliverability
 */
export function getSenderEmail(): string {
  if (process.env.NOTIFICATION_FROM_EMAIL) {
    return process.env.NOTIFICATION_FROM_EMAIL;
  }
  
  // Default to subdomain for better deliverability
  return process.env.NODE_ENV === 'production' 
    ? 'notifications@mail.ledgerflow.org'
    : 'notifications@localhost';
}

/**
 * Get the sender name for emails
 */
export function getSenderName(): string {
  return process.env.NOTIFICATION_FROM_NAME || 'Ledgerflow';
}

/**
 * Build a full URL for use in emails
 * Ensures the URL uses the correct domain
 */
export function buildEmailUrl(path: string): string {
  const baseUrl = getEmailBaseUrl();
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${baseUrl}/${cleanPath}`;
}

/**
 * Validate email configuration
 * Returns array of warning messages if configuration issues detected
 */
export function validateEmailConfig(): string[] {
  const warnings: string[] = [];
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL;
  const senderEmail = process.env.NOTIFICATION_FROM_EMAIL;
  
  // Check for localhost in production
  if (process.env.NODE_ENV === 'production') {
    if (baseUrl?.includes('localhost')) {
      warnings.push('Base URL contains localhost in production environment');
    }
    
    if (!senderEmail?.includes('@mail.')) {
      warnings.push('Sender email should use a subdomain (e.g., @mail.ledgerflow.org) for better deliverability');
    }
  }
  
  // Check for missing configuration
  if (!baseUrl) {
    warnings.push('NEXT_PUBLIC_APP_URL or APP_BASE_URL not configured');
  }
  
  if (!senderEmail) {
    warnings.push('NOTIFICATION_FROM_EMAIL not configured');
  }
  
  if (!process.env.RESEND_API_KEY) {
    warnings.push('RESEND_API_KEY not configured');
  }
  
  return warnings;
}