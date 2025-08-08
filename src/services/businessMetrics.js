/**
 * Business Metrics Tracking Service
 * Tracks financial KPIs, user behavior, and business-critical events
 */

import monitoringService from './monitoringService.js';

class BusinessMetricsService {
  constructor() {
    this.kpiThresholds = {
      transactionValue: {
        low: 10,
        medium: 100,
        high: 1000
      },
      budgetUtilization: {
        warning: 80,
        critical: 100
      },
      sessionDuration: {
        bounce: 30, // seconds
        engaged: 300 // 5 minutes
      }
    };

    this.conversionFunnels = {
      onboarding: [
        'signup_started',
        'account_created',
        'bank_connected',
        'first_transaction_viewed',
        'first_budget_created'
      ],
      budget_creation: [
        'budgets_page_visited',
        'create_budget_clicked',
        'budget_form_filled',
        'budget_created_successfully'
      ],
      transaction_management: [
        'transactions_page_visited',
        'transaction_clicked',
        'transaction_categorized',
        'transaction_saved'
      ]
    };

    this.cohortTracking = new Map();
    this.userSegments = new Map();
    this.financialMetrics = {
      totalTransactionVolume: 0,
      averageTransactionValue: 0,
      monthlyActiveUsers: new Set(),
      budgetCompliance: new Map()
    };
  }

  // Financial KPI Tracking
  trackTransaction(transactionData) {
    const {
      userId,
      amount,
      currency,
      category,
      type, // income, expense
      accountId,
      merchantName,
      timestamp
    } = transactionData;

    // Track basic transaction metrics
    monitoringService.trackBusinessEvent('transaction_processed', {
      userId,
      amount: Math.abs(amount),
      currency,
      category,
      type,
      valueSegment: this.categorizeTransactionValue(Math.abs(amount))
    });

    // Update financial metrics
    this.financialMetrics.totalTransactionVolume += Math.abs(amount);
    this.updateAverageTransactionValue(Math.abs(amount));

    // Track spending patterns
    this.trackSpendingPattern(userId, category, Math.abs(amount), timestamp);

    // Track merchant frequency
    if (merchantName) {
      this.trackMerchantEngagement(userId, merchantName, Math.abs(amount));
    }

    // Check for anomalies
    this.detectTransactionAnomalies(userId, amount, category, timestamp);

    // Track user engagement
    this.trackUserEngagement(userId, 'transaction_processed');
  }

  trackBudgetEvent(eventType, budgetData) {
    const {
      userId,
      budgetId,
      category,
      budgetAmount,
      spentAmount,
      remainingAmount,
      period
    } = budgetData;

    const utilizationRate = (spentAmount / budgetAmount) * 100;

    monitoringService.trackBusinessEvent(`budget_${eventType}`, {
      userId,
      budgetId,
      category,
      budgetAmount,
      spentAmount,
      utilizationRate,
      period,
      complianceStatus: this.getBudgetComplianceStatus(utilizationRate)
    });

    // Update budget compliance tracking
    this.updateBudgetCompliance(userId, budgetId, utilizationRate);

    // Check for budget alerts
    if (utilizationRate >= this.kpiThresholds.budgetUtilization.warning) {
      this.trackBudgetAlert(userId, budgetId, utilizationRate, category);
    }

    // Track budget creation success
    if (eventType === 'created') {
      this.trackConversionEvent('budget_creation', 'budget_created_successfully', userId);
    }
  }

  trackAccountConnection(accountData) {
    const { userId, accountType, bankName, accountCount } = accountData;

    monitoringService.trackBusinessEvent('account_connected', {
      userId,
      accountType,
      bankName,
      totalAccountsConnected: accountCount,
      connectionMethod: 'plaid'
    });

    // Track onboarding progress
    this.trackConversionEvent('onboarding', 'bank_connected', userId);

    // Track user engagement
    this.trackUserEngagement(userId, 'account_connected');

    // Update user segment
    this.updateUserSegment(userId, { hasConnectedAccounts: true });
  }

  // User Behavior Analytics
  trackPageView(pageName, userId, sessionData = {}) {
    monitoringService.trackBusinessEvent('page_viewed', {
      userId,
      pageName,
      sessionDuration: sessionData.sessionDuration || 0,
      referrer: sessionData.referrer,
      userAgent: sessionData.userAgent,
      viewport: sessionData.viewport
    });

    // Track page-specific conversions
    this.trackPageConversions(pageName, userId);

    // Update user engagement
    this.trackUserEngagement(userId, 'page_view');
  }

  trackUserAction(userId, action, context = {}) {
    const engagementScore = this.calculateEngagementScore(action, context);

    monitoringService.trackBusinessEvent('user_action', {
      userId,
      action,
      context,
      engagementScore,
      timestamp: Date.now()
    });

    // Track specific business actions
    this.trackBusinessAction(userId, action, context);

    // Update user engagement
    this.trackUserEngagement(userId, action);
  }

  trackConversionEvent(funnelName, step, userId, metadata = {}) {
    const funnel = this.conversionFunnels[funnelName];
    if (!funnel) return;

    const stepIndex = funnel.indexOf(step);
    if (stepIndex === -1) return;

    monitoringService.trackBusinessEvent('conversion_event', {
      userId,
      funnelName,
      step,
      stepIndex,
      funnelProgress: ((stepIndex + 1) / funnel.length) * 100,
      metadata
    });

    // Track funnel completion
    if (stepIndex === funnel.length - 1) {
      monitoringService.trackBusinessEvent('funnel_completed', {
        userId,
        funnelName,
        completedSteps: funnel.length
      });
    }
  }

  // User Segmentation
  updateUserSegment(userId, attributes) {
    const currentSegment = this.userSegments.get(userId) || {
      createdAt: Date.now(),
      lastActive: Date.now(),
      transactionCount: 0,
      averageTransactionValue: 0,
      budgetCount: 0,
      hasConnectedAccounts: false,
      engagementLevel: 'new'
    };

    const updatedSegment = { ...currentSegment, ...attributes, lastActive: Date.now() };
    this.userSegments.set(userId, updatedSegment);

    // Recalculate engagement level
    updatedSegment.engagementLevel = this.calculateEngagementLevel(updatedSegment);

    monitoringService.trackBusinessEvent('user_segment_updated', {
      userId,
      segment: updatedSegment.engagementLevel,
      attributes: updatedSegment
    });
  }

  // Cohort Analysis
  trackUserCohort(userId, cohortDate = null) {
    const cohort = cohortDate || new Date().toISOString().slice(0, 7); // YYYY-MM
    
    if (!this.cohortTracking.has(cohort)) {
      this.cohortTracking.set(cohort, new Set());
    }
    
    this.cohortTracking.get(cohort).add(userId);

    monitoringService.trackBusinessEvent('cohort_tracked', {
      userId,
      cohort,
      cohortSize: this.cohortTracking.get(cohort).size
    });
  }

  // Financial Health Metrics
  calculateFinancialHealthScore(userId, financialData) {
    const {
      totalIncome,
      totalExpenses,
      budgetCompliance,
      savingsRate,
      debtToIncomeRatio
    } = financialData;

    let healthScore = 100;

    // Income vs Expenses ratio
    const expenseRatio = totalExpenses / totalIncome;
    if (expenseRatio > 0.9) healthScore -= 20;
    else if (expenseRatio > 0.8) healthScore -= 10;

    // Budget compliance
    if (budgetCompliance < 0.6) healthScore -= 20;
    else if (budgetCompliance < 0.8) healthScore -= 10;

    // Savings rate
    if (savingsRate < 0.1) healthScore -= 15;
    else if (savingsRate < 0.2) healthScore -= 5;

    // Debt ratio
    if (debtToIncomeRatio > 0.4) healthScore -= 15;
    else if (debtToIncomeRatio > 0.2) healthScore -= 5;

    healthScore = Math.max(0, Math.min(100, healthScore));

    monitoringService.trackBusinessEvent('financial_health_calculated', {
      userId,
      healthScore,
      factors: {
        expenseRatio,
        budgetCompliance,
        savingsRate,
        debtToIncomeRatio
      }
    });

    return healthScore;
  }

  // Anomaly Detection
  detectTransactionAnomalies(userId, amount, category, timestamp) {
    const userHistory = this.getUserTransactionHistory(userId, category);
    
    if (userHistory.length < 5) return; // Need minimum history

    const avgAmount = userHistory.reduce((sum, t) => sum + t.amount, 0) / userHistory.length;
    const stdDev = this.calculateStandardDeviation(userHistory.map(t => t.amount));
    
    const zScore = Math.abs((amount - avgAmount) / stdDev);
    
    if (zScore > 2.5) { // Significant anomaly
      monitoringService.trackBusinessEvent('transaction_anomaly_detected', {
        userId,
        amount,
        category,
        avgAmount,
        zScore,
        severity: zScore > 3 ? 'high' : 'medium'
      });
    }
  }

  // Revenue Metrics
  trackSubscriptionMetrics(subscriptionData) {
    const {
      userId,
      subscriptionType,
      amount,
      frequency,
      status,
      startDate,
      endDate
    } = subscriptionData;

    monitoringService.trackBusinessEvent('subscription_tracked', {
      userId,
      subscriptionType,
      amount,
      frequency,
      status,
      monthlyRecurringRevenue: this.calculateMRR(amount, frequency),
      customerLifetimeValue: this.estimateCLV(amount, frequency)
    });
  }

  // Helper Methods
  categorizeTransactionValue(amount) {
    const thresholds = this.kpiThresholds.transactionValue;
    if (amount >= thresholds.high) return 'high';
    if (amount >= thresholds.medium) return 'medium';
    return 'low';
  }

  getBudgetComplianceStatus(utilizationRate) {
    if (utilizationRate >= this.kpiThresholds.budgetUtilization.critical) return 'exceeded';
    if (utilizationRate >= this.kpiThresholds.budgetUtilization.warning) return 'warning';
    return 'compliant';
  }

  calculateEngagementScore(action, context) {
    const actionScores = {
      'transaction_processed': 10,
      'budget_created': 20,
      'account_connected': 25,
      'page_view': 1,
      'export_report': 15,
      'notification_read': 2
    };

    let baseScore = actionScores[action] || 5;
    
    // Multiply by session duration factor
    if (context.sessionDuration) {
      const durationMultiplier = Math.min(2, context.sessionDuration / 300000); // 5 minutes = 1x
      baseScore *= durationMultiplier;
    }

    return Math.round(baseScore);
  }

  calculateEngagementLevel(userSegment) {
    const daysSinceCreated = (Date.now() - userSegment.createdAt) / (1000 * 60 * 60 * 24);
    const transactionFrequency = userSegment.transactionCount / Math.max(1, daysSinceCreated);
    
    if (transactionFrequency > 1) return 'highly_engaged';
    if (transactionFrequency > 0.5) return 'engaged';
    if (transactionFrequency > 0.1) return 'casual';
    if (daysSinceCreated < 7) return 'new';
    return 'dormant';
  }

  updateAverageTransactionValue(amount) {
    // Simple rolling average (in production, use more sophisticated methods)
    this.financialMetrics.averageTransactionValue = 
      (this.financialMetrics.averageTransactionValue + amount) / 2;
  }

  updateBudgetCompliance(userId, budgetId, utilizationRate) {
    if (!this.financialMetrics.budgetCompliance.has(userId)) {
      this.financialMetrics.budgetCompliance.set(userId, new Map());
    }
    
    this.financialMetrics.budgetCompliance.get(userId).set(budgetId, utilizationRate);
  }

  trackBudgetAlert(userId, budgetId, utilizationRate, category) {
    const severity = utilizationRate >= 100 ? 'critical' : 'warning';
    
    monitoringService.trackBusinessEvent('budget_alert', {
      userId,
      budgetId,
      category,
      utilizationRate,
      severity,
      alertType: utilizationRate >= 100 ? 'exceeded' : 'approaching_limit'
    });
  }

  trackSpendingPattern(userId, category, amount, timestamp) {
    // Track spending patterns by time of day, day of week, etc.
    const date = new Date(timestamp);
    const hourOfDay = date.getHours();
    const dayOfWeek = date.getDay();
    
    monitoringService.trackBusinessEvent('spending_pattern', {
      userId,
      category,
      amount,
      hourOfDay,
      dayOfWeek,
      timeSegment: this.getTimeSegment(hourOfDay)
    });
  }

  trackMerchantEngagement(userId, merchantName, amount) {
    monitoringService.trackBusinessEvent('merchant_transaction', {
      userId,
      merchantName,
      amount,
      merchantCategory: this.categorizeMerchant(merchantName)
    });
  }

  trackUserEngagement(userId, action) {
    this.financialMetrics.monthlyActiveUsers.add(userId);
    
    // Update user segment with engagement data
    this.updateUserSegment(userId, {
      lastAction: action,
      lastActive: Date.now()
    });
  }

  trackPageConversions(pageName, userId) {
    // Track page-specific conversion events
    const conversions = {
      '/app/budgets': () => this.trackConversionEvent('budget_creation', 'budgets_page_visited', userId),
      '/app/transactions': () => this.trackConversionEvent('transaction_management', 'transactions_page_visited', userId),
      '/app/dashboard': () => this.trackConversionEvent('onboarding', 'first_transaction_viewed', userId)
    };

    if (conversions[pageName]) {
      conversions[pageName]();
    }
  }

  trackBusinessAction(userId, action, context) {
    // Track specific business-critical actions
    const businessActions = {
      'budget_created': () => this.trackConversionEvent('budget_creation', 'budget_created_successfully', userId),
      'account_linked': () => this.trackConversionEvent('onboarding', 'bank_connected', userId),
      'transaction_categorized': () => this.trackConversionEvent('transaction_management', 'transaction_categorized', userId)
    };

    if (businessActions[action]) {
      businessActions[action]();
    }
  }

  // Utility Methods
  getUserTransactionHistory(userId, category, limit = 50) {
    // Placeholder - in production, fetch from database
    return [];
  }

  calculateStandardDeviation(values) {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  calculateMRR(amount, frequency) {
    const frequencyMultipliers = {
      'monthly': 1,
      'yearly': 1/12,
      'quarterly': 1/3,
      'weekly': 4.33
    };
    
    return amount * (frequencyMultipliers[frequency] || 0);
  }

  estimateCLV(amount, frequency) {
    // Simple CLV estimation (in production, use more sophisticated models)
    const mrr = this.calculateMRR(amount, frequency);
    return mrr * 24; // Assume 24-month average customer lifetime
  }

  getTimeSegment(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  categorizeMerchant(merchantName) {
    const merchantCategories = {
      'grocery': ['walmart', 'kroger', 'safeway', 'whole foods'],
      'restaurant': ['mcdonalds', 'starbucks', 'chipotle', 'subway'],
      'gas': ['shell', 'exxon', 'bp', 'chevron'],
      'retail': ['amazon', 'target', 'best buy', 'costco']
    };

    for (const [category, merchants] of Object.entries(merchantCategories)) {
      if (merchants.some(merchant => merchantName.toLowerCase().includes(merchant))) {
        return category;
      }
    }
    
    return 'other';
  }

  // Reporting Methods
  generateKPIReport() {
    return {
      timestamp: Date.now(),
      financialMetrics: {
        totalTransactionVolume: this.financialMetrics.totalTransactionVolume,
        averageTransactionValue: this.financialMetrics.averageTransactionValue,
        monthlyActiveUsers: this.financialMetrics.monthlyActiveUsers.size,
        budgetComplianceRate: this.calculateOverallBudgetCompliance()
      },
      userSegments: this.getUserSegmentDistribution(),
      cohortSizes: Object.fromEntries(this.cohortTracking),
      conversionRates: this.calculateConversionRates()
    };
  }

  calculateOverallBudgetCompliance() {
    let totalBudgets = 0;
    let compliantBudgets = 0;

    for (const userBudgets of this.financialMetrics.budgetCompliance.values()) {
      for (const utilization of userBudgets.values()) {
        totalBudgets++;
        if (utilization <= this.kpiThresholds.budgetUtilization.warning) {
          compliantBudgets++;
        }
      }
    }

    return totalBudgets > 0 ? (compliantBudgets / totalBudgets) * 100 : 0;
  }

  getUserSegmentDistribution() {
    const distribution = {};
    for (const segment of this.userSegments.values()) {
      distribution[segment.engagementLevel] = (distribution[segment.engagementLevel] || 0) + 1;
    }
    return distribution;
  }

  calculateConversionRates() {
    // Placeholder for conversion rate calculations
    // In production, this would analyze funnel data
    return {
      onboarding: 0.75,
      budget_creation: 0.60,
      transaction_management: 0.85
    };
  }
}

const businessMetricsService = new BusinessMetricsService();

export default businessMetricsService;