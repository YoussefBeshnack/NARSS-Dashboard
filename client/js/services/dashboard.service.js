import { apiClient } from './api.js';

export class DashboardService {
  /**
   * Fetch consolidated statistics and KPIs for dashboard overview
   */
  async getStats() {
    return apiClient.get('/dashboard/stats');
  }
}

export const dashboardService = new DashboardService();
