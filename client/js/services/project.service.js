import { apiClient } from './api.js';

export class ProjectService {
  /**
   * Fetch projects list with optional status and search filters
   */
  async getProjects({ status, search } = {}) {
    const query = new URLSearchParams();
    if (status) query.append('status', status);
    if (search) query.append('search', search);

    const queryString = query.toString();
    const endpoint = `/projects${queryString ? `?${queryString}` : ''}`;
    return apiClient.get(endpoint);
  }

  /**
   * Get single project details by ID
   */
  async getProjectById(id) {
    return apiClient.get(`/projects/${id}`);
  }

  /**
   * Create new project
   */
  async createProject(projectData) {
    return apiClient.post('/projects', projectData);
  }

  /**
   * Update existing project
   */
  async updateProject(id, projectData) {
    return apiClient.put(`/projects/${id}`, projectData);
  }

  /**
   * Delete project (Admin only)
   */
  async deleteProject(id) {
    return apiClient.delete(`/projects/${id}`);
  }

  /**
   * Add team member to project
   */
  async addTeamMember(projectId, memberData) {
    return apiClient.post(`/projects/${projectId}/members`, memberData);
  }

  /**
   * Remove team member from project
   */
  async removeTeamMember(projectId, userId) {
    return apiClient.delete(`/projects/${projectId}/members/${userId}`);
  }

  /**
   * Add report to project (supports FormData with file upload or JSON payload)
   */
  async addReport(projectId, reportData) {
    return apiClient.post(`/projects/${projectId}/reports`, reportData);
  }

  /**
   * Update report
   */
  async updateReport(projectId, reportId, reportData) {
    return apiClient.put(`/projects/${projectId}/reports/${reportId}`, reportData);
  }

  /**
   * Delete report
   */
  async deleteReport(projectId, reportId) {
    return apiClient.delete(`/projects/${projectId}/reports/${reportId}`);
  }

  /**
   * Backward-compatibility aliases for milestones
   */
  async addMilestone(projectId, milestoneData) {
    return this.addReport(projectId, milestoneData);
  }

  async updateMilestone(projectId, milestoneId, milestoneData) {
    return this.updateReport(projectId, milestoneId, milestoneData);
  }

  async deleteMilestone(projectId, milestoneId) {
    return this.deleteReport(projectId, milestoneId);
  }
}

export const projectService = new ProjectService();
