/**
 * Payment monitoring and logging service for production
 * Tracks payment link generation, success rates, and failures
 */

import { prisma } from "@/lib/prisma";
import { InvoiceEventType, InvoiceEventStatus, InvoiceEventChannel } from "@prisma/client";

export type PaymentLinkMetrics = {
  totalAttempted: number;
  totalSuccessful: number;
  totalFailed: number;
  successRate: number;
  commonErrors: Array<{ error: string; count: number }>;
  averageCreationTime: number;
};

export type PaymentLinkResult = {
  success: boolean;
  paymentLinkUrl?: string;
  error?: string;
  duration: number;
  invoiceId: string;
  invoiceNumber: string;
};

/**
 * Log payment link creation attempt with timing and results
 */
export async function logPaymentLinkAttempt(result: PaymentLinkResult): Promise<void> {
  try {
    await prisma.invoiceEvent.create({
      data: {
        invoiceId: result.invoiceId,
        type: InvoiceEventType.PAYMENT_LINK_CREATED,
        status: result.success ? InvoiceEventStatus.SUCCESS : InvoiceEventStatus.FAILED,
        channel: InvoiceEventChannel.SYSTEM,
        detail: {
          invoiceNumber: result.invoiceNumber,
          paymentLinkUrl: result.paymentLinkUrl,
          error: result.error,
          duration: result.duration,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
        },
      },
    });

    // Log to console for immediate visibility in production
    if (result.success) {
      console.log(`✅ Payment link created for ${result.invoiceNumber} in ${result.duration}ms`);
    } else {
      console.error(`❌ Payment link failed for ${result.invoiceNumber}: ${result.error} (${result.duration}ms)`);
    }
  } catch (error) {
    console.error('Failed to log payment link attempt:', error);
  }
}

/**
 * Get payment link metrics for monitoring dashboard
 */
export async function getPaymentLinkMetrics(
  startDate: Date,
  endDate: Date = new Date()
): Promise<PaymentLinkMetrics> {
  try {
    const events = await prisma.invoiceEvent.findMany({
      where: {
        type: InvoiceEventType.PAYMENT_LINK_CREATED,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        status: true,
        detail: true,
        createdAt: true,
      },
    });

    const totalAttempted = events.length;
    const successful = events.filter(e => e.status === InvoiceEventStatus.SUCCESS);
    const failed = events.filter(e => e.status === InvoiceEventStatus.FAILED);
    
    const totalSuccessful = successful.length;
    const totalFailed = failed.length;
    const successRate = totalAttempted > 0 ? (totalSuccessful / totalAttempted) * 100 : 0;

    // Extract common errors
    const errorCounts = new Map<string, number>();
    failed.forEach(event => {
      const detail = event.detail as Record<string, unknown>;
      const error = (detail?.error as string) || 'Unknown error';
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
    });

    const commonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate average creation time
    const durations = events
      .map(e => {
        const detail = e.detail as Record<string, unknown>;
        return detail?.duration as number;
      })
      .filter(d => typeof d === 'number');
    const averageCreationTime = durations.length > 0 
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length 
      : 0;

    return {
      totalAttempted,
      totalSuccessful,
      totalFailed,
      successRate: Math.round(successRate * 100) / 100,
      commonErrors,
      averageCreationTime: Math.round(averageCreationTime),
    };
  } catch (error) {
    console.error('Failed to get payment link metrics:', error);
    return {
      totalAttempted: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      successRate: 0,
      commonErrors: [],
      averageCreationTime: 0,
    };
  }
}

/**
 * Monitor payment link health and alert if issues detected
 */
export async function checkPaymentLinkHealth(): Promise<{
  healthy: boolean;
  issues: string[];
  metrics: PaymentLinkMetrics;
}> {
  const issues: string[] = [];
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  try {
    const metrics = await getPaymentLinkMetrics(twentyFourHoursAgo);
    
    // Check for low success rate
    if (metrics.totalAttempted > 5 && metrics.successRate < 80) {
      issues.push(`Low payment link success rate: ${metrics.successRate}%`);
    }
    
    // Check for high failure count
    if (metrics.totalFailed > 10) {
      issues.push(`High number of payment link failures: ${metrics.totalFailed}`);
    }
    
    // Check for slow creation times
    if (metrics.averageCreationTime > 5000) {
      issues.push(`Slow payment link creation: ${metrics.averageCreationTime}ms average`);
    }
    
    // Check for no recent activity (could indicate system issues)
    if (metrics.totalAttempted === 0) {
      issues.push('No payment link creation attempts in the last 24 hours');
    }
    
    const healthy = issues.length === 0;
    
    if (!healthy) {
      console.warn('🚨 Payment link health check failed:', issues);
    } else {
      console.log('✅ Payment link health check passed');
    }
    
    return { healthy, issues, metrics };
  } catch (error) {
    console.error('Payment link health check failed:', error);
    return {
      healthy: false,
      issues: ['Health check system error'],
      metrics: {
        totalAttempted: 0,
        totalSuccessful: 0,
        totalFailed: 0,
        successRate: 0,
        commonErrors: [],
        averageCreationTime: 0,
      },
    };
  }
}

/**
 * Log email button click tracking (for analytics)
 */
export async function logEmailButtonClick(
  invoiceId: string,
  userAgent?: string,
  ip?: string
): Promise<void> {
  try {
    await prisma.invoiceEvent.create({
      data: {
        invoiceId,
        type: InvoiceEventType.EMAIL_CLICKED,
        status: InvoiceEventStatus.SUCCESS,
        channel: InvoiceEventChannel.EMAIL,
        detail: {
          userAgent,
          ip,
          timestamp: new Date().toISOString(),
          clickType: 'payment_button',
        },
      },
    });
  } catch (error) {
    console.error('Failed to log email button click:', error);
  }
}