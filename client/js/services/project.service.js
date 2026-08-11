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
   * Add milestone to project
   */
  async addMilestone(projectId, milestoneData) {
    return apiClient.post(`/projects/${projectId}/milestones`, milestoneData);
  }

  /**
   * Update milestone
   */
  async updateMilestone(projectId, milestoneId, milestoneData) {
    return apiClient.put(`/projects/${projectId}/milestones/${milestoneId}`, milestoneData);
  }

  /**
   * Delete milestone
   */
  async deleteMilestone(projectId, milestoneId) {
    return apiClient.delete(`/projects/${projectId}/milestones/${milestoneId}`);
  }
}

export const projectService = new ProjectService();
