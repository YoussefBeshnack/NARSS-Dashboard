import { requireAuth } from "../core/guard.js";
import { authStore } from "../services/auth.store.js";
import { authService } from "../services/auth.service.js";
import { dashboardService } from "../services/dashboard.service.js";
import { projectService } from "../services/project.service.js";
import { expenseService } from "../services/expense.service.js";
import { documentService } from "../services/document.service.js";
import { publicationService } from "../services/publication.service.js";
import { Toast } from "../components/toast.js";
import { Modal } from "../components/modal.js";
import { ROUTES } from "../core/constants.js";

// Global State
let currentUser = null;
let userRole = 'Researcher';
let chartBudgetSpentInstance = null;
let chartMilestonesInstance = null;
let projectsCache = [];

// Main Entry Point
if (requireAuth()) {
  initDashboard();
}

async function initDashboard() {
  try {
    // 1. Fetch authenticated user profile
    const profileRes = await authService.getMe().catch(() => ({ user: authStore.getUser() }));
    currentUser = profileRes.user || authStore.getUser() || { name: 'User', role: 'Researcher' };
    userRole = currentUser.role || 'Researcher';

    // 2. Setup User Interface Shell
    updateUserShell();
    setupNavigation();
    setupGlobalActions();
    setupLogout();

    // 3. Load initial view based on URL hash
    const initialView = window.location.hash.replace('#', '') || 'dashboard';
    switchView(initialView);
  } catch (err) {
    console.error('Dashboard init error:', err);
    Toast.error('Failed to initialize session.');
  }
}

// ----------------------------------------------------
// UI SHELL & ROLE PERMISSIONS
// ----------------------------------------------------
function updateUserShell() {
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  const initialsEl = document.getElementById('user-avatar-initials');

  if (nameEl) nameEl.textContent = currentUser.name;
  if (roleEl) roleEl.textContent = userRole;
  if (initialsEl) initialsEl.textContent = currentUser.name.charAt(0).toUpperCase();

  // Role permissions
  const isAdmin = userRole === 'Admin';
  const isManagerOrAdmin = userRole === 'Admin' || userRole === 'Manager';

  // Toggle global header buttons based on role
  const newProjBtn = document.getElementById('global-new-project-btn');
  if (newProjBtn) {
    newProjBtn.classList.toggle('d-none', !isManagerOrAdmin);
  }
}

function setupLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      authStore.clearSession();
      Toast.info('Logged out.');
      setTimeout(() => {
        window.location.href = ROUTES.LOGIN;
      }, 300);
    });
  }
}

function setupNavigation() {
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = link.getAttribute('data-view');
      window.location.hash = targetView;
      switchView(targetView);
    });
  });

  window.addEventListener('hashchange', () => {
    const view = window.location.hash.replace('#', '') || 'dashboard';
    switchView(view);
  });
}

function switchView(viewName) {
  // Update sidebar active state
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
  navLinks.forEach((link) => {
    const isTarget = link.getAttribute('data-view') === viewName;
    link.classList.toggle('active', isTarget);
  });

  // Hide all panels
  const panels = document.querySelectorAll('.view-panel');
  panels.forEach((panel) => panel.classList.add('d-none'));

  // Show target panel
  const targetPanel = document.getElementById(`view-${viewName}`);
  if (targetPanel) {
    targetPanel.classList.remove('d-none');
  }

  // Set page title
  const pageTitle = document.getElementById('page-title');
  const titles = {
    dashboard: 'Dashboard Overview & Analytics',
    projects: 'Project Management & Timelines',
    expenses: 'Finance & Expense Logs',
    documents: 'Document Repository & Versioning',
    publications: 'Research Outputs & Publications',
    profile: 'User Profile',
    settings: 'System Settings & Role Permissions',
  };
  if (pageTitle) pageTitle.textContent = titles[viewName] || 'Dashboard';

  // Load data for specific view
  if (viewName === 'dashboard') loadDashboardView();
  else if (viewName === 'projects') loadProjectsView();
  else if (viewName === 'expenses') loadExpensesView();
  else if (viewName === 'documents') loadDocumentsView();
  else if (viewName === 'publications') loadPublicationsView();
  else if (viewName === 'profile') loadProfileView();
}

function setupGlobalActions() {
  const newProjBtn = document.getElementById('global-new-project-btn');
  if (newProjBtn) newProjBtn.addEventListener('click', openCreateProjectModal);

  const logExpBtn = document.getElementById('global-log-expense-btn');
  if (logExpBtn) logExpBtn.addEventListener('click', openLogExpenseModal);

  const uploadDocBtn = document.getElementById('global-upload-doc-btn');
  if (uploadDocBtn) uploadDocBtn.addEventListener('click', openUploadDocModal);
}

// ----------------------------------------------------
// VIEW 1: DASHBOARD & ANALYTICS
// ----------------------------------------------------
async function loadDashboardView() {
  try {
    const res = await dashboardService.getStats();
    if (!res.success) return;

    const data = res.data;

    // Update KPI cards
    document.getElementById('kpi-total-projects').textContent = data.projects?.total || 0;
    document.getElementById('kpi-active-projects').textContent = `${data.projects?.active || 0} Active Projects`;

    const spent = data.finances?.overallSpent || 0;
    const util = data.finances?.utilizationPercentage || 0;
    document.getElementById('kpi-spent').textContent = `${spent.toLocaleString()} EGP`;
    document.getElementById('kpi-budget-utilization').textContent = `${util}% of budget spent`;

    document.getElementById('kpi-outputs').textContent = data.outputs?.total || 0;
    const pubBreakdown = data.outputs?.breakdown || {};
    document.getElementById('kpi-outputs-breakdown').textContent = `${pubBreakdown.Publication || 0} Pubs, ${pubBreakdown.Patent || 0} Patents, ${pubBreakdown.Dataset || 0} Datasets`;

    const msRate = data.milestones?.completionRate || 0;
    document.getElementById('kpi-milestones-rate').textContent = `${msRate}%`;
    document.getElementById('kpi-milestones-count').textContent = `${data.milestones?.completed || 0} of ${data.milestones?.total || 0} completed`;

    // Render Charts
    renderBudgetChart(data.chartProjectData || []);
    renderMilestonesChart(data.milestones || {});
  } catch (err) {
    Toast.error('Failed to load analytics stats.');
  }
}

function renderBudgetChart(chartProjects) {
  const ctx = document.getElementById('chart-budget-spent');
  if (!ctx) return;

  if (chartBudgetSpentInstance) {
    chartBudgetSpentInstance.destroy();
  }

  const labels = chartProjects.map((p) => p.title.length > 20 ? p.title.substring(0, 18) + '...' : p.title);
  const budgets = chartProjects.map((p) => p.budget);
  const spents = chartProjects.map((p) => p.spent);

  chartBudgetSpentInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Allocated Budget',
          data: budgets,
          backgroundColor: 'rgba(0, 165, 212, 0.6)',
          borderColor: '#00a5d4',
          borderWidth: 1,
        },
        {
          label: 'Actual Spent',
          data: spents,
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderColor: '#10b981',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#8d99ae' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#8d99ae' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      },
      plugins: {
        legend: { labels: { color: '#e0e6ed' } },
      },
    },
  });
}

function renderMilestonesChart(milestonesData) {
  const ctx = document.getElementById('chart-milestones');
  if (!ctx) return;

  if (chartMilestonesInstance) {
    chartMilestonesInstance.destroy();
  }

  chartMilestonesInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'In Progress', 'Pending'],
      datasets: [
        {
          data: [
            milestonesData.completed || 0,
            milestonesData.inProgress || 0,
            milestonesData.pending || 0,
          ],
          backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#e0e6ed' } },
      },
    },
  });
}

// ----------------------------------------------------
// VIEW 2: PROJECT MANAGEMENT
// ----------------------------------------------------
async function loadProjectsView() {
  const search = document.getElementById('project-search-input')?.value || '';
  const status = document.getElementById('project-status-filter')?.value || '';

  try {
    const res = await projectService.getProjects({ search, status });
    if (!res.success) return;

    projectsCache = res.projects || [];
    renderProjectsGrid(projectsCache);

    // Setup filter listeners once
    const searchInput = document.getElementById('project-search-input');
    const statusFilter = document.getElementById('project-status-filter');
    const createBtn = document.getElementById('create-project-btn');

    if (searchInput && !searchInput.dataset.hasListener) {
      searchInput.dataset.hasListener = 'true';
      searchInput.addEventListener('input', () => loadProjectsView());
    }
    if (statusFilter && !statusFilter.dataset.hasListener) {
      statusFilter.dataset.hasListener = 'true';
      statusFilter.addEventListener('change', () => loadProjectsView());
    }
    if (createBtn) {
      createBtn.classList.toggle('d-none', !(userRole === 'Admin' || userRole === 'Manager'));
      if (!createBtn.dataset.hasListener) {
        createBtn.dataset.hasListener = 'true';
        createBtn.addEventListener('click', openCreateProjectModal);
      }
    }
  } catch (err) {
    Toast.error('Failed to load projects.');
  }
}

function renderProjectsGrid(projects) {
  const container = document.getElementById('projects-grid-container');
  if (!container) return;

  if (projects.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="fa-solid fa-folder-open fs-1 text-muted mb-3 d-block"></i>
        <h6 class="text-light">No projects found</h6>
        <small class="text-muted">Try adjusting search or status filters</small>
      </div>
    `;
    return;
  }

  container.innerHTML = projects.map((p) => {
    const statusClass = `badge-${p.status ? p.status.toLowerCase().replace(/\s+/g, '') : 'planning'}`;
    const piName = p.pi ? p.pi.name : 'Unassigned';
    const membersCount = p.teamMembers ? p.teamMembers.length : 0;
    const milestonesCount = p.milestones ? p.milestones.length : 0;
    const completedMs = p.milestones ? p.milestones.filter((m) => m.status === 'Completed').length : 0;

    return `
      <div class="col-12 col-md-6 col-xl-4">
        <div class="glass-card p-4 h-100 d-flex flex-column justify-content-between">
          <div>
            <div class="d-flex align-items-start justify-content-between mb-3">
              <span class="badge ${statusClass} px-3 py-2">${p.status}</span>
              <small class="text-muted"><i class="fa-solid fa-calendar me-1"></i>${new Date(p.startDate).toLocaleDateString()} - ${new Date(p.endDate).toLocaleDateString()}</small>
            </div>
            
            <h5 class="fw-bold text-light mb-2">${p.title}</h5>
            <p class="text-secondary small mb-3 text-truncate" style="max-height: 48px; white-space: normal;">${p.description}</p>
            
            <div class="d-flex align-items-center justify-content-between text-muted small mb-2">
              <span>PI: <strong class="text-light">${piName}</strong></span>
              <span>Budget: <strong class="text-success">${p.budget.toLocaleString()} EGP</strong></span>
            </div>

            <div class="mb-3">
              <div class="d-flex align-items-center justify-content-between small text-muted mb-1">
                <span>Milestones Progress</span>
                <span>${completedMs} / ${milestonesCount}</span>
              </div>
              <div class="progress bg-dark" style="height: 6px;">
                <div class="progress-bar bg-info" style="width: ${milestonesCount ? (completedMs / milestonesCount) * 100 : 0}%;"></div>
              </div>
            </div>
          </div>

          <div class="pt-3 border-top border-secondary border-opacity-25 d-flex align-items-center justify-content-between">
            <small class="text-muted"><i class="fa-solid fa-users me-1"></i>${membersCount} Members</small>
            <button class="btn btn-outline-info btn-sm rounded-2 view-project-detail-btn" data-id="${p._id}">
              Details & Milestones <i class="fa-solid fa-arrow-right ms-1"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach Detail Button Click Handlers
  container.querySelectorAll('.view-project-detail-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openProjectDetailModal(id);
    });
  });
}

async function openProjectDetailModal(projectId) {
  try {
    const res = await projectService.getProjectById(projectId);
    if (!res.success) return;

    const p = res.project;
    const isOwnerOrAdmin = userRole === 'Admin' || userRole === 'Manager' || (p.pi && p.pi._id === currentUser.id);

    const membersHtml = p.teamMembers && p.teamMembers.length > 0
      ? p.teamMembers.map((m) => `
          <div class="d-flex align-items-center justify-content-between py-2 border-bottom border-secondary border-opacity-25">
            <div>
              <div class="fw-semibold text-light">${m.user ? m.user.name : 'User'}</div>
              <small class="text-secondary">${m.user ? m.user.email : ''} (${m.role})</small>
            </div>
            ${isOwnerOrAdmin ? `<button class="btn btn-outline-danger btn-sm remove-member-btn" data-user-id="${m.user ? m.user._id : ''}"><i class="fa-solid fa-trash"></i></button>` : ''}
          </div>
        `).join('')
      : '<p class="text-muted small">No team members assigned.</p>';

    const milestonesHtml = p.milestones && p.milestones.length > 0
      ? p.milestones.map((m) => `
          <div class="d-flex align-items-center justify-content-between py-2 border-bottom border-secondary border-opacity-25">
            <div>
              <div class="fw-semibold text-light ${m.status === 'Completed' ? 'text-decoration-line-through text-muted' : ''}">${m.title}</div>
              <small class="text-secondary">Due: ${new Date(m.deadline).toLocaleDateString()} | Status: <span class="badge ${m.status === 'Completed' ? 'bg-success' : 'bg-warning text-dark'}">${m.status}</span></small>
            </div>
            <div class="d-flex align-items-center gap-2">
              <button class="btn btn-sm ${m.status === 'Completed' ? 'btn-outline-secondary' : 'btn-success'} toggle-ms-btn" data-ms-id="${m._id}" data-status="${m.status}">
                ${m.status === 'Completed' ? 'Undo' : 'Complete'}
              </button>
              ${isOwnerOrAdmin ? `<button class="btn btn-outline-danger btn-sm delete-ms-btn" data-ms-id="${m._id}"><i class="fa-solid fa-trash"></i></button>` : ''}
            </div>
          </div>
        `).join('')
      : '<p class="text-muted small">No milestones defined.</p>';

    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <div class="mb-3">
        <p class="text-secondary mb-3">${p.description}</p>
        <div class="row g-2 mb-3 small">
          <div class="col-6"><strong>Funding Source:</strong> ${p.fundingSource || 'Internal'}</div>
          <div class="col-6"><strong>Status:</strong> ${p.status}</div>
          <div class="col-6"><strong>Budget:</strong> ${p.budget.toLocaleString()} EGP</div>
          <div class="col-6"><strong>PI:</strong> ${p.pi ? p.pi.name : 'N/A'}</div>
        </div>
      </div>

      <hr class="border-secondary border-opacity-25" />

      <!-- Team Members Section -->
      <div class="mb-4">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h6 class="fw-bold text-light m-0"><i class="fa-solid fa-users text-info me-2"></i>Team Members</h6>
          ${isOwnerOrAdmin ? `<button class="btn btn-sm btn-outline-info" id="add-member-btn"><i class="fa-solid fa-user-plus me-1"></i> Add Member</button>` : ''}
        </div>
        ${membersHtml}
      </div>

      <!-- Milestones Section -->
      <div>
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h6 class="fw-bold text-light m-0"><i class="fa-solid fa-list-check text-warning me-2"></i>Project Milestones</h6>
          ${isOwnerOrAdmin ? `<button class="btn btn-sm btn-outline-warning" id="add-milestone-btn"><i class="fa-solid fa-plus me-1"></i> Add Milestone</button>` : ''}
        </div>
        ${milestonesHtml}
      </div>
    `;

    const actions = [];
    if (userRole === 'Admin') {
      actions.push({
        text: 'Delete Project',
        class: 'btn-danger me-auto',
        onClick: async (_, m) => {
          Modal.confirm({
            title: 'Delete Project',
            message: `Are you sure you want to delete project "${p.title}"?`,
            onConfirm: async () => {
              await projectService.deleteProject(p._id);
              Toast.success('Project deleted.');
              m.close();
              loadProjectsView();
            },
          });
        },
      });
    }

    const modal = new Modal({
      title: p.title,
      content: modalContent,
      size: 'modal-lg',
      actions,
    });

    // Attach internal event handlers inside detail modal
    const addMemberBtn = modalContent.querySelector('#add-member-btn');
    if (addMemberBtn) {
      addMemberBtn.addEventListener('click', () => {
        openAddMemberModal(p._id, () => {
          modal.close();
          openProjectDetailModal(p._id);
        });
      });
    }

    const addMsBtn = modalContent.querySelector('#add-milestone-btn');
    if (addMsBtn) {
      addMsBtn.addEventListener('click', () => {
        openAddMilestoneModal(p._id, () => {
          modal.close();
          openProjectDetailModal(p._id);
        });
      });
    }

    // Toggle Milestone handlers
    modalContent.querySelectorAll('.toggle-ms-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const msId = btn.getAttribute('data-ms-id');
        const currentStatus = btn.getAttribute('data-status');
        const newStatus = currentStatus === 'Completed' ? 'In Progress' : 'Completed';

        try {
          await projectService.updateMilestone(p._id, msId, { status: newStatus });
          Toast.success(`Milestone status updated to ${newStatus}`);
          modal.close();
          openProjectDetailModal(p._id);
          loadProjectsView();
        } catch (err) {
          Toast.error(err.message || 'Failed to update milestone.');
        }
      });
    });

    // Delete Milestone handlers
    modalContent.querySelectorAll('.delete-ms-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const msId = btn.getAttribute('data-ms-id');
        try {
          await projectService.deleteMilestone(p._id, msId);
          Toast.success('Milestone deleted.');
          modal.close();
          openProjectDetailModal(p._id);
          loadProjectsView();
        } catch (err) {
          Toast.error(err.message || 'Failed to delete milestone.');
        }
      });
    });

    // Remove Member handlers
    modalContent.querySelectorAll('.remove-member-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const uId = btn.getAttribute('data-user-id');
        if (!uId) return;
        try {
          await projectService.removeTeamMember(p._id, uId);
          Toast.success('Team member removed.');
          modal.close();
          openProjectDetailModal(p._id);
        } catch (err) {
          Toast.error(err.message || 'Failed to remove member.');
        }
      });
    });

  } catch (err) {
    Toast.error('Failed to load project details.');
  }
}

function openCreateProjectModal() {
  const formHtml = `
    <form id="create-project-form">
      <div class="mb-3">
        <label class="fw-medium">Project Title</label>
        <input type="text" name="title" class="form-control" required placeholder="Satellite Image AI Pipeline" />
      </div>
      <div class="mb-3">
        <label class="fw-medium">Description</label>
        <textarea name="description" class="form-control" rows="3" required placeholder="Project overview..."></textarea>
      </div>
      <div class="row g-3 mb-3">
        <div class="col-6">
          <label class="fw-medium">Start Date</label>
          <input type="date" name="startDate" class="form-control" required />
        </div>
        <div class="col-6">
          <label class="fw-medium">End Date</label>
          <input type="date" name="endDate" class="form-control" required />
        </div>
      </div>
      <div class="row g-3 mb-3">
        <div class="col-6">
          <label class="fw-medium">Budget (EGP)</label>
          <input type="number" name="budget" class="form-control" min="0" required placeholder="500000" />
        </div>
        <div class="col-6">
          <label class="fw-medium">Funding Source</label>
          <input type="text" name="fundingSource" class="form-control" placeholder="Internal / Grant" />
        </div>
      </div>
      <div class="mb-3">
        <label class="fw-medium">Initial Status</label>
        <select name="status" class="form-select">
          <option value="Planning" selected>Planning</option>
          <option value="Active">Active</option>
          <option value="On Hold">On Hold</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
    </form>
  `;

  const modal = new Modal({
    title: 'Create New Research Project',
    content: formHtml,
    size: 'modal-lg',
    actions: [
      { text: 'Cancel', class: 'btn-outline-secondary', onClick: (_, m) => m.close() },
      {
        text: 'Save Project',
        class: 'btn-secondary',
        onClick: async (_, m) => {
          const form = document.getElementById('create-project-form');
          const formData = new FormData(form);
          const payload = {};
          formData.forEach((val, key) => (payload[key] = val));

          if (!payload.title || !payload.description || !payload.startDate || !payload.endDate || !payload.budget) {
            Toast.error('Please fill in all required fields.');
            return;
          }

          try {
            await projectService.createProject(payload);
            Toast.success('Project created successfully!');
            m.close();
            loadProjectsView();
          } catch (err) {
            Toast.error(err.message || 'Failed to create project.');
          }
        },
      },
    ],
  });
}

function openAddMemberModal(projectId, callback) {
  const formHtml = `
    <form id="add-member-form">
      <div class="mb-3">
        <label class="fw-medium">User ID (MongoDB ObjectId of User)</label>
        <input type="text" name="userId" class="form-control" required placeholder="603d2b78f1a23c4567890xyz" />
      </div>
      <div class="mb-3">
        <label class="fw-medium">Project Role</label>
        <select name="role" class="form-select">
          <option value="Researcher" selected>Researcher</option>
          <option value="Lead">Lead</option>
          <option value="Advisor">Advisor</option>
          <option value="Contributor">Contributor</option>
        </select>
      </div>
    </form>
  `;

  new Modal({
    title: 'Assign Team Member',
    content: formHtml,
    actions: [
      { text: 'Cancel', class: 'btn-outline-secondary', onClick: (_, m) => m.close() },
      {
        text: 'Assign',
        class: 'btn-secondary',
        onClick: async (_, m) => {
          const form = document.getElementById('add-member-form');
          const formData = new FormData(form);
          const payload = { userId: formData.get('userId'), role: formData.get('role') };

          try {
            await projectService.addTeamMember(projectId, payload);
            Toast.success('Team member assigned!');
            m.close();
            if (callback) callback();
          } catch (err) {
            Toast.error(err.message || 'Failed to assign team member.');
          }
        },
      },
    ],
  });
}

function openAddMilestoneModal(projectId, callback) {
  const formHtml = `
    <form id="add-milestone-form">
      <div class="mb-3">
        <label class="fw-medium">Milestone Title</label>
        <input type="text" name="title" class="form-control" required placeholder="Phase 1 Dataset Collection" />
      </div>
      <div class="mb-3">
        <label class="fw-medium">Deadline Date</label>
        <input type="date" name="deadline" class="form-control" required />
      </div>
      <div class="mb-3">
        <label class="fw-medium">Status</label>
        <select name="status" class="form-select">
          <option value="Pending" selected>Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
    </form>
  `;

  new Modal({
    title: 'Add Project Milestone',
    content: formHtml,
    actions: [
      { text: 'Cancel', class: 'btn-outline-secondary', onClick: (_, m) => m.close() },
      {
        text: 'Add Milestone',
        class: 'btn-warning text-dark',
        onClick: async (_, m) => {
          const form = document.getElementById('add-milestone-form');
          const formData = new FormData(form);
          const payload = {
            title: formData.get('title'),
            deadline: formData.get('deadline'),
            status: formData.get('status'),
          };

          try {
            await projectService.addMilestone(projectId, payload);
            Toast.success('Milestone added!');
            m.close();
            if (callback) callback();
          } catch (err) {
            Toast.error(err.message || 'Failed to add milestone.');
          }
        },
      },
    ],
  });
}

// ----------------------------------------------------
// VIEW 3: FINANCE & EXPENSES
// ----------------------------------------------------
async function loadExpensesView() {
  try {
    // Populate project dropdown filter & summary cards
    const summaryRes = await expenseService.getSummary();
    if (summaryRes.success) {
      renderBudgetSummaryCards(summaryRes.summary || []);
      populateProjectFilterOptions(summaryRes.summary || []);
    }

    // Fetch expense records
    const project = document.getElementById('expense-project-filter')?.value || '';
    const category = document.getElementById('expense-category-filter')?.value || '';
    const status = document.getElementById('expense-status-filter')?.value || '';

    const expensesRes = await expenseService.getExpenses({ project, category, status });
    if (expensesRes.success) {
      renderExpensesTable(expensesRes.expenses || []);
    }

    // Attach listeners
    const projFilter = document.getElementById('expense-project-filter');
    const catFilter = document.getElementById('expense-category-filter');
    const statFilter = document.getElementById('expense-status-filter');
    const logExpBtn = document.getElementById('log-expense-btn');

    if (projFilter && !projFilter.dataset.hasListener) {
      projFilter.dataset.hasListener = 'true';
      projFilter.addEventListener('change', () => loadExpensesView());
    }
    if (catFilter && !catFilter.dataset.hasListener) {
      catFilter.dataset.hasListener = 'true';
      catFilter.addEventListener('change', () => loadExpensesView());
    }
    if (statFilter && !statFilter.dataset.hasListener) {
      statFilter.dataset.hasListener = 'true';
      statFilter.addEventListener('change', () => loadExpensesView());
    }
    if (logExpBtn && !logExpBtn.dataset.hasListener) {
      logExpBtn.dataset.hasListener = 'true';
      logExpBtn.addEventListener('click', openLogExpenseModal);
    }
  } catch (err) {
    Toast.error('Failed to load expense logs.');
  }
}

function renderBudgetSummaryCards(summaries) {
  const container = document.getElementById('budget-summary-items');
  if (!container) return;

  if (summaries.length === 0) {
    container.innerHTML = '<div class="col-12"><small class="text-muted">No budget summaries available.</small></div>';
    return;
  }

  container.innerHTML = summaries.slice(0, 4).map((s) => `
    <div class="col-12 col-md-6 col-xl-3">
      <div class="bg-black bg-opacity-30 p-3 rounded-3 border border-secondary border-opacity-25">
        <small class="text-info fw-semibold text-truncate d-block">${s.projectTitle}</small>
        <div class="d-flex align-items-center justify-content-between my-2">
          <span class="fs-5 fw-bold text-light">${s.totalSpent.toLocaleString()} EGP</span>
          <small class="text-secondary">${s.utilizationPercentage}% spent</small>
        </div>
        <div class="progress bg-dark" style="height: 5px;">
          <div class="progress-bar bg-success" style="width: ${s.utilizationPercentage}%;"></div>
        </div>
      </div>
    </div>
  `).join('');
}

function populateProjectFilterOptions(summaries) {
  const filter = document.getElementById('expense-project-filter');
  if (!filter || filter.children.length > 1) return;

  summaries.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.projectId;
    opt.textContent = s.projectTitle;
    filter.appendChild(opt);
  });
}

function renderExpensesTable(expenses) {
  const tbody = document.getElementById('expenses-table-body');
  if (!tbody) return;

  if (expenses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No expense logs found.</td></tr>`;
    return;
  }

  const isManagerOrAdmin = userRole === 'Admin' || userRole === 'Manager';

  tbody.innerHTML = expenses.map((e) => {
    const statusBadge = `badge-${e.status ? e.status.toLowerCase() : 'pending'}`;
    const receiptLink = e.receiptUrl
      ? `<a href="http://localhost:5000${e.receiptUrl}" target="_blank" class="btn btn-outline-light btn-sm"><i class="fa-solid fa-paperclip me-1"></i>Receipt</a>`
      : '<span class="text-muted small">None</span>';

    return `
      <tr>
        <td>${new Date(e.date).toLocaleDateString()}</td>
        <td><strong class="text-light">${e.project ? e.project.title : 'Project'}</strong></td>
        <td><span class="badge bg-secondary">${e.category}</span></td>
        <td class="text-truncate" style="max-width: 200px;">${e.description || '-'}</td>
        <td class="fw-bold text-success">${e.amount.toLocaleString()} EGP</td>
        <td>${receiptLink}</td>
        <td><span class="badge ${statusBadge}">${e.status}</span></td>
        <td><small class="text-secondary">${e.createdBy ? e.createdBy.name : 'User'}</small></td>
        <td class="text-end">
          ${isManagerOrAdmin && e.status === 'Pending' ? `
            <button class="btn btn-outline-success btn-sm me-1 approve-exp-btn" data-id="${e._id}">Approve</button>
            <button class="btn btn-outline-danger btn-sm me-1 reject-exp-btn" data-id="${e._id}">Reject</button>
          ` : ''}
          ${userRole === 'Admin' || userRole === 'Manager' ? `<button class="btn btn-outline-danger btn-sm delete-exp-btn" data-id="${e._id}"><i class="fa-solid fa-trash"></i></button>` : ''}
        </td>
      </tr>
    `;
  }).join('');

  // Status Action Handlers
  tbody.querySelectorAll('.approve-exp-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      await expenseService.updateExpense(id, { status: 'Approved' });
      Toast.success('Expense approved!');
      loadExpensesView();
    });
  });

  tbody.querySelectorAll('.reject-exp-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      await expenseService.updateExpense(id, { status: 'Rejected' });
      Toast.warning('Expense rejected.');
      loadExpensesView();
    });
  });

  tbody.querySelectorAll('.delete-exp-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      Modal.confirm({
        title: 'Delete Expense Log',
        message: 'Are you sure you want to delete this expense record?',
        onConfirm: async () => {
          await expenseService.deleteExpense(id);
          Toast.success('Expense deleted.');
          loadExpensesView();
        },
      });
    });
  });
}

function openLogExpenseModal() {
  const projectOptions = projectsCache.map((p) => `<option value="${p._id}">${p.title}</option>`).join('');

  const formHtml = `
    <form id="log-expense-form" enctype="multipart/form-data">
      <div class="mb-3">
        <label class="fw-medium">Target Project</label>
        <select name="project" class="form-select" required>
          <option value="" disabled selected>Select Project...</option>
          ${projectOptions}
        </select>
      </div>
      <div class="row g-3 mb-3">
        <div class="col-6">
          <label class="fw-medium">Category</label>
          <select name="category" class="form-select" required>
            <option value="Personnel">Personnel</option>
            <option value="Equipment">Equipment</option>
            <option value="Travel">Travel</option>
            <option value="Subcontracting">Subcontracting</option>
            <option value="Supplies">Supplies</option>
            <option value="Overhead">Overhead</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div class="col-6">
          <label class="fw-medium">Amount (EGP)</label>
          <input type="number" name="amount" class="form-control" min="0" step="0.01" required placeholder="12500" />
        </div>
      </div>
      <div class="mb-3">
        <label class="fw-medium">Description</label>
        <input type="text" name="description" class="form-control" placeholder="Receipt / Expense description..." />
      </div>
      <div class="mb-3">
        <label class="fw-medium">Receipt File Attachment (PDF / Image)</label>
        <input type="file" name="receipt" class="form-control" accept="image/*,application/pdf" />
      </div>
    </form>
  `;

  new Modal({
    title: 'Log New Expense',
    content: formHtml,
    actions: [
      { text: 'Cancel', class: 'btn-outline-secondary', onClick: (_, m) => m.close() },
      {
        text: 'Submit Expense',
        class: 'btn-secondary',
        onClick: async (_, m) => {
          const form = document.getElementById('log-expense-form');
          const formData = new FormData(form);

          if (!formData.get('project') || !formData.get('category') || !formData.get('amount')) {
            Toast.error('Project, category, and amount are required.');
            return;
          }

          try {
            await expenseService.createExpense(formData);
            Toast.success('Expense logged successfully!');
            m.close();
            loadExpensesView();
          } catch (err) {
            Toast.error(err.message || 'Failed to log expense.');
          }
        },
      },
    ],
  });
}

// ----------------------------------------------------
// VIEW 4: DOCUMENT MANAGEMENT
// ----------------------------------------------------
async function loadDocumentsView() {
  const keyword = document.getElementById('doc-search-input')?.value || '';
  const category = document.getElementById('doc-category-filter')?.value || '';
  const startDate = document.getElementById('doc-start-date')?.value || '';
  const endDate = document.getElementById('doc-end-date')?.value || '';

  try {
    const res = await documentService.getDocuments({ keyword, category, startDate, endDate });
    if (res.success) {
      renderDocumentsTable(res.documents || []);
    }

    // Attach listeners
    const searchInput = document.getElementById('doc-search-input');
    const catFilter = document.getElementById('doc-category-filter');
    const startInput = document.getElementById('doc-start-date');
    const endInput = document.getElementById('doc-end-date');
    const uploadBtn = document.getElementById('upload-doc-btn');

    if (searchInput && !searchInput.dataset.hasListener) {
      searchInput.dataset.hasListener = 'true';
      searchInput.addEventListener('input', () => loadDocumentsView());
    }
    if (catFilter && !catFilter.dataset.hasListener) {
      catFilter.dataset.hasListener = 'true';
      catFilter.addEventListener('change', () => loadDocumentsView());
    }
    if (startInput && !startInput.dataset.hasListener) {
      startInput.dataset.hasListener = 'true';
      startInput.addEventListener('change', () => loadDocumentsView());
    }
    if (endInput && !endInput.dataset.hasListener) {
      endInput.dataset.hasListener = 'true';
      endInput.addEventListener('change', () => loadDocumentsView());
    }
    if (uploadBtn && !uploadBtn.dataset.hasListener) {
      uploadBtn.dataset.hasListener = 'true';
      uploadBtn.addEventListener('click', openUploadDocModal);
    }
  } catch (err) {
    Toast.error('Failed to load documents.');
  }
}

function renderDocumentsTable(documents) {
  const tbody = document.getElementById('documents-table-body');
  if (!tbody) return;

  if (documents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No documents found.</td></tr>`;
    return;
  }

  const isManagerOrAdmin = userRole === 'Admin' || userRole === 'Manager';

  tbody.innerHTML = documents.map((d) => {
    const sizeKb = d.fileSize ? (d.fileSize / 1024).toFixed(1) + ' KB' : 'N/A';
    const activeVersion = `v${d.versionNumber || 1}`;

    return `
      <tr>
        <td>
          <a href="http://localhost:5000${d.filePath}" target="_blank" class="fw-semibold text-info text-decoration-none">
            <i class="fa-solid fa-file-pdf me-2"></i>${d.fileName}
          </a>
        </td>
        <td><span class="text-light">${d.project ? d.project.title : 'Project'}</span></td>
        <td><span class="badge bg-secondary">${d.category}</span></td>
        <td><span class="badge bg-primary">${activeVersion}</span></td>
        <td><small class="text-secondary">${sizeKb}</small></td>
        <td><small class="text-secondary">${d.uploadedBy ? d.uploadedBy.name : 'User'}</small></td>
        <td><small class="text-secondary">${new Date(d.createdAt).toLocaleDateString()}</small></td>
        <td class="text-end">
          <button class="btn btn-outline-info btn-sm me-1 upload-new-ver-btn" data-id="${d._id}">
            <i class="fa-solid fa-plus me-1"></i>New Ver
          </button>
          <button class="btn btn-outline-light btn-sm me-1 view-ver-history-btn" data-id="${d._id}">
            <i class="fa-solid fa-clock-rotate-left me-1"></i>History
          </button>
          ${isManagerOrAdmin ? `<button class="btn btn-outline-danger btn-sm delete-doc-btn" data-id="${d._id}"><i class="fa-solid fa-trash"></i></button>` : ''}
        </td>
      </tr>
    `;
  }).join('');

  // Actions
  tbody.querySelectorAll('.upload-new-ver-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openUploadVersionModal(id);
    });
  });

  tbody.querySelectorAll('.view-ver-history-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openVersionHistoryModal(id);
    });
  });

  tbody.querySelectorAll('.delete-doc-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      Modal.confirm({
        title: 'Delete Document',
        message: 'Are you sure you want to delete this document and all historical versions?',
        onConfirm: async () => {
          await documentService.deleteDocument(id);
          Toast.success('Document deleted.');
          loadDocumentsView();
        },
      });
    });
  });
}

function openUploadDocModal() {
  const projectOptions = projectsCache.map((p) => `<option value="${p._id}">${p.title}</option>`).join('');

  const formHtml = `
    <form id="upload-doc-form" enctype="multipart/form-data">
      <div class="mb-3">
        <label class="fw-medium">Target Project</label>
        <select name="project" class="form-select" required>
          <option value="" disabled selected>Select Project...</option>
          ${projectOptions}
        </select>
      </div>
      <div class="mb-3">
        <label class="fw-medium">Category</label>
        <select name="category" class="form-select">
          <option value="Report" selected>Report</option>
          <option value="Contract">Contract</option>
          <option value="Proposal">Proposal</option>
          <option value="Ethics">Ethics</option>
          <option value="Financial">Financial</option>
          <option value="Data">Data</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="fw-medium">Select Document File</label>
        <input type="file" name="file" class="form-control" required />
      </div>
    </form>
  `;

  new Modal({
    title: 'Upload Document (Version 1)',
    content: formHtml,
    actions: [
      { text: 'Cancel', class: 'btn-outline-secondary', onClick: (_, m) => m.close() },
      {
        text: 'Upload File',
        class: 'btn-secondary',
        onClick: async (_, m) => {
          const form = document.getElementById('upload-doc-form');
          const formData = new FormData(form);

          if (!formData.get('project') || !formData.get('file')) {
            Toast.error('Project and file attachment are required.');
            return;
          }

          try {
            await documentService.uploadDocument(formData);
            Toast.success('Document uploaded successfully!');
            m.close();
            loadDocumentsView();
          } catch (err) {
            Toast.error(err.message || 'Failed to upload document.');
          }
        },
      },
    ],
  });
}

function openUploadVersionModal(documentId) {
  const formHtml = `
    <form id="upload-ver-form" enctype="multipart/form-data">
      <div class="mb-3">
        <label class="fw-medium">New Version File</label>
        <input type="file" name="file" class="form-control" required />
      </div>
    </form>
  `;

  new Modal({
    title: 'Upload New Revision / Version',
    content: formHtml,
    actions: [
      { text: 'Cancel', class: 'btn-outline-secondary', onClick: (_, m) => m.close() },
      {
        text: 'Upload Revision',
        class: 'btn-secondary',
        onClick: async (_, m) => {
          const form = document.getElementById('upload-ver-form');
          const formData = new FormData(form);

          if (!formData.get('file')) {
            Toast.error('Please select a file.');
            return;
          }

          try {
            await documentService.uploadVersion(documentId, formData);
            Toast.success('Document updated to new version!');
            m.close();
            loadDocumentsView();
          } catch (err) {
            Toast.error(err.message || 'Failed to upload version.');
          }
        },
      },
    ],
  });
}

async function openVersionHistoryModal(documentId) {
  try {
    const res = await documentService.getDocumentById(documentId);
    if (!res.success) return;

    const d = res.document;
    const history = d.versionHistory || [];

    const historyHtml = history.length > 0
      ? history.map((v) => `
          <div class="d-flex align-items-center justify-content-between py-3 border-bottom border-secondary border-opacity-25">
            <div>
              <div class="fw-bold text-light">Version ${v.versionNumber} ${v.versionNumber === d.versionNumber ? '<span class="badge bg-success ms-2">Active</span>' : ''}</div>
              <small class="text-secondary">${v.fileName || d.fileName} | Uploaded: ${new Date(v.uploadedAt).toLocaleString()}</small>
            </div>
            <div>
              ${v.versionNumber !== d.versionNumber ? `
                <button class="btn btn-outline-warning btn-sm revert-ver-btn" data-ver="${v.versionNumber}">
                  <i class="fa-solid fa-rotate-left me-1"></i>Revert to v${v.versionNumber}
                </button>
              ` : '<span class="text-muted small">Active Version</span>'}
            </div>
          </div>
        `).join('')
      : '<p class="text-muted">No version history available.</p>';

    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <div class="mb-3">
        <h6 class="fw-semibold text-info mb-1">${d.fileName}</h6>
        <small class="text-secondary">Project: ${d.project ? d.project.title : 'N/A'}</small>
      </div>
      <hr class="border-secondary border-opacity-25" />
      <div>
        ${historyHtml}
      </div>
    `;

    const modal = new Modal({
      title: 'Document Revision History',
      content: modalContent,
      size: 'modal-lg',
    });

    // Revert button handlers
    modalContent.querySelectorAll('.revert-ver-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const targetVer = btn.getAttribute('data-ver');
        try {
          await documentService.revertVersion(d._id, targetVer);
          Toast.success(`Document reverted to Version ${targetVer}!`);
          modal.close();
          loadDocumentsView();
        } catch (err) {
          Toast.error(err.message || 'Failed to revert version.');
        }
      });
    });
  } catch (err) {
    Toast.error('Failed to load version history.');
  }
}

// ----------------------------------------------------
// VIEW 5: RESEARCH OUTPUTS & PUBLICATIONS
// ----------------------------------------------------
async function loadPublicationsView() {
  const search = document.getElementById('pub-search-input')?.value || '';
  const outputType = document.getElementById('pub-type-filter')?.value || '';
  const status = document.getElementById('pub-status-filter')?.value || '';

  try {
    const res = await publicationService.getPublications({ search, outputType, status });
    if (res.success) {
      renderPublicationsTable(res.publications || []);
    }

    // Attach listeners
    const searchInput = document.getElementById('pub-search-input');
    const typeFilter = document.getElementById('pub-type-filter');
    const statusFilter = document.getElementById('pub-status-filter');
    const registerBtn = document.getElementById('register-pub-btn');
    const exportBtn = document.getElementById('export-csv-btn');

    if (searchInput && !searchInput.dataset.hasListener) {
      searchInput.dataset.hasListener = 'true';
      searchInput.addEventListener('input', () => loadPublicationsView());
    }
    if (typeFilter && !typeFilter.dataset.hasListener) {
      typeFilter.dataset.hasListener = 'true';
      typeFilter.addEventListener('change', () => loadPublicationsView());
    }
    if (statusFilter && !statusFilter.dataset.hasListener) {
      statusFilter.dataset.hasListener = 'true';
      statusFilter.addEventListener('change', () => loadPublicationsView());
    }
    if (registerBtn && !registerBtn.dataset.hasListener) {
      registerBtn.dataset.hasListener = 'true';
      registerBtn.addEventListener('click', openRegisterPublicationModal);
    }
    if (exportBtn && !exportBtn.dataset.hasListener) {
      exportBtn.dataset.hasListener = 'true';
      exportBtn.addEventListener('click', handleCSVExport);
    }
  } catch (err) {
    Toast.error('Failed to load research outputs.');
  }
}

function renderPublicationsTable(publications) {
  const tbody = document.getElementById('publications-table-body');
  if (!tbody) return;

  if (publications.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No research outputs found.</td></tr>`;
    return;
  }

  const isManagerOrAdmin = userRole === 'Admin' || userRole === 'Manager';

  tbody.innerHTML = publications.map((p) => {
    const authorsStr = Array.isArray(p.authors) ? p.authors.join(', ') : p.authors || 'N/A';
    const doi = p.externalIdentifiers ? p.externalIdentifiers.doi : '';

    return `
      <tr>
        <td>
          <div class="fw-semibold text-light mb-1">${p.title}</div>
          <span class="badge bg-secondary">${p.outputType}</span>
        </td>
        <td><small class="text-secondary">${authorsStr}</small></td>
        <td><small class="text-light">${p.project ? p.project.title : 'Project'}</small></td>
        <td><small class="text-secondary">${p.journalOrPublisher || '-'}</small></td>
        <td>
          ${doi ? `<a href="https://doi.org/${doi}" target="_blank" class="btn btn-outline-info btn-sm"><i class="fa-solid fa-link me-1"></i>DOI</a>` : '<span class="text-muted small">-</span>'}
        </td>
        <td><span class="badge bg-success">${p.status}</span></td>
        <td class="text-end">
          ${isManagerOrAdmin ? `<button class="btn btn-outline-danger btn-sm delete-pub-btn" data-id="${p._id}"><i class="fa-solid fa-trash"></i></button>` : ''}
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.delete-pub-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      Modal.confirm({
        title: 'Delete Publication',
        message: 'Are you sure you want to delete this research output?',
        onConfirm: async () => {
          await publicationService.deletePublication(id);
          Toast.success('Publication deleted.');
          loadPublicationsView();
        },
      });
    });
  });
}

async function handleCSVExport() {
  try {
    Toast.info('Preparing CSV export...');
    const blob = await publicationService.exportCSV();

    // Trigger file download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'research_outputs_export.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    Toast.success('Export downloaded successfully!');
  } catch (err) {
    Toast.error(err.message || 'Failed to export CSV.');
  }
}

function openRegisterPublicationModal() {
  const projectOptions = projectsCache.map((p) => `<option value="${p._id}">${p.title}</option>`).join('');

  const formHtml = `
    <form id="register-pub-form">
      <div class="mb-3">
        <label class="fw-medium">Target Project</label>
        <select name="project" class="form-select" required>
          <option value="" disabled selected>Select Project...</option>
          ${projectOptions}
        </select>
      </div>
      <div class="row g-3 mb-3">
        <div class="col-6">
          <label class="fw-medium">Output Type</label>
          <select name="outputType" class="form-select" required>
            <option value="Publication" selected>Publication</option>
            <option value="Patent">Patent</option>
            <option value="Dataset">Dataset</option>
            <option value="Conference Paper">Conference Paper</option>
            <option value="Book Chapter">Book Chapter</option>
            <option value="Software">Software</option>
          </select>
        </div>
        <div class="col-6">
          <label class="fw-medium">Status</label>
          <select name="status" class="form-select">
            <option value="Published" selected>Published</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Granted">Granted</option>
          </select>
        </div>
      </div>
      <div class="mb-3">
        <label class="fw-medium">Title</label>
        <input type="text" name="title" class="form-control" required placeholder="Deep Neural Networks for Earth Observation" />
      </div>
      <div class="mb-3">
        <label class="fw-medium">Authors (comma separated)</label>
        <input type="text" name="authors" class="form-control" placeholder="Dr. Sarah Connor, Dr. Kyle Reese" />
      </div>
      <div class="mb-3">
        <label class="fw-medium">Journal / Publisher</label>
        <input type="text" name="journalOrPublisher" class="form-control" placeholder="IEEE Transactions on Geoscience" />
      </div>
      <div class="row g-3 mb-3">
        <div class="col-6">
          <label class="fw-medium">DOI</label>
          <input type="text" name="doi" class="form-control" placeholder="10.1109/TGRS.2026.1234567" />
        </div>
        <div class="col-6">
          <label class="fw-medium">Publication Date</label>
          <input type="date" name="publicationDate" class="form-control" />
        </div>
      </div>
    </form>
  `;

  new Modal({
    title: 'Register Research Output',
    content: formHtml,
    size: 'modal-lg',
    actions: [
      { text: 'Cancel', class: 'btn-outline-secondary', onClick: (_, m) => m.close() },
      {
        text: 'Register Output',
        class: 'btn-secondary',
        onClick: async (_, m) => {
          const form = document.getElementById('register-pub-form');
          const formData = new FormData(form);
          const authorsInput = formData.get('authors');
          const authorsArray = authorsInput ? authorsInput.split(',').map((a) => a.trim()).filter(Boolean) : [];

          const payload = {
            project: formData.get('project'),
            outputType: formData.get('outputType'),
            status: formData.get('status'),
            title: formData.get('title'),
            authors: authorsArray,
            journalOrPublisher: formData.get('journalOrPublisher'),
            publicationDate: formData.get('publicationDate') || undefined,
            externalIdentifiers: {
              doi: formData.get('doi') || '',
            },
          };

          if (!payload.project || !payload.title || !payload.outputType) {
            Toast.error('Project, output type, and title are required.');
            return;
          }

          try {
            await publicationService.createPublication(payload);
            Toast.success('Research output registered successfully!');
            m.close();
            loadPublicationsView();
          } catch (err) {
            Toast.error(err.message || 'Failed to register output.');
          }
        },
      },
    ],
  });
}

// ----------------------------------------------------
// VIEW 6: USER PROFILE
// ----------------------------------------------------
async function loadProfileView() {
  document.getElementById('profile-name').textContent = currentUser.name;
  document.getElementById('profile-email').textContent = currentUser.email;
  document.getElementById('profile-role-badge').textContent = userRole;
  document.getElementById('profile-avatar-initials').textContent = currentUser.name.charAt(0).toUpperCase();

  if (currentUser.createdAt) {
    document.getElementById('profile-created-at').textContent = new Date(currentUser.createdAt).toLocaleDateString();
  }

  // Load assigned projects
  try {
    const res = await projectService.getProjects();
    if (res.success) {
      const projects = res.projects || [];
      const assignedContainer = document.getElementById('profile-assigned-projects');
      if (assignedContainer) {
        if (projects.length === 0) {
          assignedContainer.innerHTML = '<p class="text-muted m-0">No assigned projects.</p>';
        } else {
          assignedContainer.innerHTML = projects.map((p) => `
            <div class="d-flex align-items-center justify-content-between py-2 border-bottom border-secondary border-opacity-25">
              <div>
                <strong class="text-light">${p.title}</strong>
                <small class="text-secondary d-block">${p.status} | Budget: ${p.budget.toLocaleString()} EGP</small>
              </div>
              <span class="badge bg-secondary">${p.pi && p.pi._id === currentUser.id ? 'Principal Investigator' : 'Team Member'}</span>
            </div>
          `).join('');
        }
      }
    }
  } catch (err) {
    console.error('Failed to load profile projects:', err);
  }
}
