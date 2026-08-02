import { requireAuth } from '../core/guard.js';
import { authStore } from '../services/auth.store.js';

// Protect page: guests get redirected to login
if (!requireAuth()) return 

// Read saved profile data
const user = authStore.getUser();
const token = authStore.getToken();

// Example: Update UI dynamically
/** 
 * document.querySelector('#welcome-heading').textContent = `Welcome back, ${user.name}!`;
 */

// Example: Attach token to API requests
// Automatically attaches 'Authorization: Bearer <token>' header!
// const userProfile = await apiClient.get('/user/profile');
// const userStats = await apiClient.get('/dashboard/stats');


// Example: Logout button handler
// Attach logout listener
// const logoutBtn = document.querySelector('#logout-btn');
// if (logoutBtn) {
//   logoutBtn.addEventListener('click', async (e) => {
//     e.preventDefault();
    
//     // Disable button briefly to prevent double clicks
//     logoutBtn.disabled = true;
//     logoutBtn.textContent = 'Logging out...';

//     await handleLogout();
//   });
// }