import { apiClient } from './api.js';

export class DocumentService {
  /**
   * Fetch documents with optional project, category, keyword, and date filters
   */
  async getDocuments({ project, category, keyword, startDate, endDate } = {}) {
    const query = new URLSearchParams();
    if (project) query.append('project', project);
    if (category) query.append('category', category);
    if (keyword) query.append('keyword', keyword);
    if (startDate) query.append('startDate', startDate);
    if (endDate) query.append('endDate', endDate);

    const queryString = query.toString();
    const endpoint = `/documents${queryString ? `?${queryString}` : ''}`;
    return apiClient.get(endpoint);
  }

  /**
   * Get document metadata and version history by ID
   */
  async getDocumentById(id) {
    return apiClient.get(`/documents/${id}`);
  }

  /**
   * Upload a new document (FormData object with project, category, file)
   */
  async uploadDocument(formData) {
    return apiClient.request('/documents', {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Upload a new version for an existing document (FormData object with file)
   */
  async uploadVersion(documentId, formData) {
    return apiClient.request(`/documents/${documentId}/versions`, {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Revert document to a target version number
   */
  async revertVersion(documentId, versionNumber) {
    return apiClient.post(`/documents/${documentId}/revert/${versionNumber}`);
  }

  /**
   * Delete document and its version history (Admin/Manager only)
   */
  async deleteDocument(id) {
    return apiClient.delete(`/documents/${id}`);
  }
}

export const documentService = new DocumentService();
