import { apiClient } from './api.js';

export class ExpenseService {
  /**
   * Fetch expense logs with optional project, category, and status filters
   */
  async getExpenses({ project, category, status } = {}) {
    const query = new URLSearchParams();
    if (project) query.append('project', project);
    if (category) query.append('category', category);
    if (status) query.append('status', status);

    const queryString = query.toString();
    const endpoint = `/expenses${queryString ? `?${queryString}` : ''}`;
    return apiClient.get(endpoint);
  }

  /**
   * Get project budget summary report
   */
  async getSummary(projectId = null) {
    const endpoint = projectId ? `/expenses/summary?projectId=${projectId}` : '/expenses/summary';
    return apiClient.get(endpoint);
  }

  /**
   * Get single expense details
   */
  async getExpenseById(id) {
    return apiClient.get(`/expenses/${id}`);
  }

  /**
   * Log new expense (accepts FormData for file uploads or plain object)
   */
  async createExpense(expensePayload) {
    if (expensePayload instanceof FormData) {
      return apiClient.request('/expenses', {
        method: 'POST',
        body: expensePayload,
      });
    }
    return apiClient.post('/expenses', expensePayload);
  }

  /**
   * Update expense record
   */
  async updateExpense(id, expensePayload) {
    if (expensePayload instanceof FormData) {
      return apiClient.request(`/expenses/${id}`, {
        method: 'PUT',
        body: expensePayload,
      });
    }
    return apiClient.put(`/expenses/${id}`, expensePayload);
  }

  /**
   * Delete expense record (Admin/Manager only)
   */
  async deleteExpense(id) {
    return apiClient.delete(`/expenses/${id}`);
  }
}

export const expenseService = new ExpenseService();
