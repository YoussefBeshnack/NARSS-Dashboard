import { apiClient } from './api.js';

export class PublicationService {
  /**
   * Fetch research outputs with optional filters
   */
  async getPublications({ project, outputType, status, search } = {}) {
    const query = new URLSearchParams();
    if (project) query.append('project', project);
    if (outputType) query.append('outputType', outputType);
    if (status) query.append('status', status);
    if (search) query.append('search', search);

    const queryString = query.toString();
    const endpoint = `/publications${queryString ? `?${queryString}` : ''}`;
    return apiClient.get(endpoint);
  }

  /**
   * Export all research outputs to CSV blob
   */
  async exportCSV() {
    return apiClient.request('/publications/export/csv', {
      method: 'GET',
      responseType: 'blob',
    });
  }

  /**
   * Get single publication details
   */
  async getPublicationById(id) {
    return apiClient.get(`/publications/${id}`);
  }

  /**
   * Register a new research output
   */
  async createPublication(publicationData) {
    return apiClient.post('/publications', publicationData);
  }

  /**
   * Update publication details
   */
  async updatePublication(id, publicationData) {
    return apiClient.put(`/publications/${id}`, publicationData);
  }

  /**
   * Delete publication record (Admin/Manager only)
   */
  async deletePublication(id) {
    return apiClient.delete(`/publications/${id}`);
  }
}

export const publicationService = new PublicationService();
