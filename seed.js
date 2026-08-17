/**
 * NARSS Dashboard — Full Data Seeder
 * Populates the system with realistic, professional data for testing.
 * Run: node seed.js
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const BASE = 'http://localhost:5000/api';

// ─── Helper ────────────────────────────────────────────────────────────────────
const post = (url, body, token) =>
  fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  }).then(r => r.json());

const put = (url, body, token) =>
  fetch(`${BASE}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).then(r => r.json());

const postForm = (url, form, token) =>
  fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() },
    body: form,
  }).then(r => r.json());

// ─── Temp PDF / TXT file creators ─────────────────────────────────────────────
const TMP = path.join(__dirname, 'tmp_seed');
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP);

function makePdf(name, title, content) {
  const filePath = path.join(TMP, name);
  // Minimal valid PDF
  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${content.length + 50}>>
stream
BT /F1 14 Tf 72 750 Td (${title}) Tj 0 -24 Td (${content.substring(0, 100)}) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
trailer<</Size 6/Root 1 0 R>>
startxref 9
%%EOF`;
  fs.writeFileSync(filePath, pdf);
  return filePath;
}

function makeTxt(name, content) {
  const filePath = path.join(TMP, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

// ─── Cleanup ───────────────────────────────────────────────────────────────────
function cleanup() {
  try { fs.rmSync(TMP, { recursive: true }); } catch {}
}

// ─── Seed Data Definitions ────────────────────────────────────────────────────
const USERS = [
  { name: 'Dr. Ahmed Mostafa El-Sayed',    email: 'ahmed.elsayed@narss.sci.eg',    password: 'Narss@2026!', role: 'Manager' },
  { name: 'Dr. Heba Nabil Farouk',         email: 'heba.farouk@narss.sci.eg',      password: 'Narss@2026!', role: 'Researcher' },
  { name: 'Eng. Omar Khaled Mansour',      email: 'omar.mansour@narss.sci.eg',     password: 'Narss@2026!', role: 'Researcher' },
  { name: 'Dr. Samar Ibrahim Abdel-Aziz',  email: 'samar.abdelaziz@narss.sci.eg',  password: 'Narss@2026!', role: 'Researcher' },
  { name: 'Prof. Walid Hassan Zaki',       email: 'walid.zaki@narss.sci.eg',       password: 'Narss@2026!', role: 'Manager' },
  { name: 'Dr. Nourhan Tarek Soliman',     email: 'nourhan.soliman@narss.sci.eg',  password: 'Narss@2026!', role: 'Researcher' },
  { name: 'Eng. Kareem Youssef Aly',       email: 'kareem.aly@narss.sci.eg',       password: 'Narss@2026!', role: 'Researcher' },
  { name: 'Dr. Dina Fathy Mahmoud',        email: 'dina.mahmoud@narss.sci.eg',     password: 'Narss@2026!', role: 'Researcher' },
  { name: 'Mr. Tarek Saeed Al-Ghamdi',     email: 'tarek.alghamdi@ksa.partner.eg', password: 'Narss@2026!', role: 'External Partner' },
];

const PROJECTS = (users) => [
  {
    title: 'Satellite-Based Agricultural Land Monitoring System (SALMS)',
    description: 'Development of an integrated remote sensing system utilizing multispectral Landsat-9 and Sentinel-2 imagery to monitor agricultural land use change, crop health indices, and irrigation inefficiencies across the Nile Delta region.',
    startDate: '2024-01-15',
    endDate: '2026-12-31',
    budget: 4750000,
    fundingSource: 'Egyptian Science and Technology Development Fund (STDF)',
    status: 'Active',
    pi: users['ahmed.elsayed@narss.sci.eg'].id,
    teamMembers: [
      { userId: users['heba.farouk@narss.sci.eg'].id, role: 'Researcher' },
      { userId: users['omar.mansour@narss.sci.eg'].id, role: 'Researcher' },
      { userId: users['dina.mahmoud@narss.sci.eg'].id, role: 'Contributor' },
    ],
    reports: [
      { title: 'Q1 2024 – Project Kickoff & Baseline Assessment', reportType: 'Periodic', deadline: '2024-03-31', status: 'Completed' },
      { title: 'Q2 2024 – Multispectral Data Acquisition Phase I', reportType: 'Periodic', deadline: '2024-06-30', status: 'Completed' },
      { title: 'Q3 2024 – Crop Classification Algorithm Development', reportType: 'Periodic', deadline: '2024-09-30', status: 'Completed' },
      { title: 'Mid-Term Evaluation Report', reportType: 'Semi-Final', deadline: '2025-06-30', status: 'In Progress' },
      { title: 'Final Scientific Report – SALMS', reportType: 'Final', deadline: '2026-12-01', status: 'Pending' },
    ],
    expenses: [
      { category: 'Equipment', amount: 875000, description: 'High-resolution multispectral sensor array and calibration equipment from EORC', date: '2024-02-10', status: 'Approved' },
      { category: 'Personnel', amount: 420000, description: 'Q1-Q2 2024 researcher stipends and field technician salaries', date: '2024-06-30', status: 'Approved' },
      { category: 'Travel', amount: 85000, description: 'Field survey campaigns across Kafr El-Sheikh, Beheira, and Dakahlia governorates', date: '2024-04-18', status: 'Approved' },
      { category: 'Subcontracting', amount: 220000, description: 'Remote sensing data processing — contracted to Space Applications Centre', date: '2024-07-01', status: 'Pending' },
      { category: 'Supplies', amount: 34500, description: 'Field sampling kits, soil sensors, and GPS receivers', date: '2024-05-15', status: 'Approved' },
    ],
    documents: [
      { fileName: 'SALMS_Project_Proposal_v2.pdf', category: 'Proposal', docContent: 'SALMS PROJECT PROPOSAL v2.0\n\nThis document outlines the full scientific scope, methodology, and expected deliverables for the Satellite-Based Agricultural Land Monitoring System. The project targets the Nile Delta region with a coverage area of approximately 25,000 km2.' },
      { fileName: 'SALMS_Ethics_Clearance_Certificate.pdf', category: 'Ethics', docContent: 'ETHICS CLEARANCE CERTIFICATE\n\nClearance Number: NARSS-EC-2024-0031\nProject: Satellite-Based Agricultural Land Monitoring System\nCleared by: NARSS Research Ethics Committee\nDate: January 10, 2024\n\nThis project has been reviewed and approved for data collection and field operations.' },
    ],
    publications: [
      {
        outputType: 'Publication',
        title: 'Crop Classification Accuracy Assessment Using Sentinel-2 Time-Series Imagery in the Nile Delta',
        authors: ['El-Sayed, A.M.', 'Farouk, H.N.', 'Mansour, O.K.'],
        journalOrPublisher: 'Remote Sensing of Environment – Elsevier',
        doi: '10.1016/j.rse.2024.114201',
        status: 'Published',
        date: '2024-09-15',
      },
      {
        outputType: 'Conference Paper',
        title: 'Deep Learning Approaches for Irrigation Zone Detection from Multispectral Satellite Data',
        authors: ['Mansour, O.K.', 'El-Sayed, A.M.'],
        journalOrPublisher: 'IEEE IGARSS 2024 – Athens, Greece',
        doi: '10.1109/IGARSS54640.2024.10641234',
        status: 'Published',
        date: '2024-07-10',
      },
    ],
  },

  {
    title: 'Urban Heat Island Mitigation Strategies for Greater Cairo Metropolitan Area',
    description: 'A comprehensive study employing thermal infrared satellite imagery and land surface temperature modeling to map urban heat island patterns across Greater Cairo. The project aims to develop evidence-based green infrastructure recommendations for city planners and policy makers.',
    startDate: '2023-09-01',
    endDate: '2025-08-31',
    budget: 2900000,
    fundingSource: 'Cairo Governorate – Urban Planning Authority & NARSS Co-Funding',
    status: 'Active',
    pi: users['walid.zaki@narss.sci.eg'].id,
    teamMembers: [
      { userId: users['samar.abdelaziz@narss.sci.eg'].id, role: 'Researcher' },
      { userId: users['nourhan.soliman@narss.sci.eg'].id, role: 'Researcher' },
      { userId: users['kareem.aly@narss.sci.eg'].id, role: 'Contributor' },
    ],
    reports: [
      { title: 'Urban Thermal Baseline Mapping – Phase 1', reportType: 'Periodic', deadline: '2023-12-15', status: 'Completed' },
      { title: 'LST Analysis: Summer Peak Season Results', reportType: 'Periodic', deadline: '2024-03-31', status: 'Completed' },
      { title: 'Green Infrastructure Pilot Assessment – Maadi & Heliopolis', reportType: 'Semi-Final', deadline: '2024-10-30', status: 'In Progress' },
      { title: 'Final Policy Recommendations Report', reportType: 'Final', deadline: '2025-07-31', status: 'Pending' },
    ],
    expenses: [
      { category: 'Equipment', amount: 550000, description: 'FLIR thermal imaging drone system and ground calibration panels', date: '2023-10-05', status: 'Approved' },
      { category: 'Personnel', amount: 380000, description: 'Annual salary allocation for 3 research engineers – 2024', date: '2024-01-01', status: 'Approved' },
      { category: 'Travel', amount: 42000, description: 'Ground truth validation surveys across 12 Cairo districts', date: '2024-03-22', status: 'Approved' },
      { category: 'Overhead', amount: 145000, description: 'Cloud computing resources – Google Earth Engine subscription and storage', date: '2024-02-01', status: 'Approved' },
      { category: 'Subcontracting', amount: 185000, description: 'Urban planning consultation – Ain Shams University Architecture Faculty', date: '2024-05-10', status: 'Pending' },
    ],
    documents: [
      { fileName: 'UHI_Cairo_Research_Contract_2023.pdf', category: 'Contract', docContent: 'RESEARCH COLLABORATION AGREEMENT\n\nParties: National Authority for Remote Sensing and Space Sciences (NARSS) and Cairo Governorate Urban Planning Authority.\n\nThis contract governs the joint research initiative on Urban Heat Island patterns and mitigation within the Greater Cairo Metropolitan Area.' },
      { fileName: 'UHI_Thermal_Baseline_Data_Report.pdf', category: 'Report', docContent: 'URBAN THERMAL BASELINE MAPPING REPORT\nPhase 1 – September to December 2023\n\nExecutive Summary:\nThis report presents land surface temperature (LST) profiles derived from Landsat-8 thermal infrared imagery across 22 districts of Greater Cairo.' },
      { fileName: 'UHI_Green_Infrastructure_GIS_Layers.zip', category: 'Data', docContent: 'GIS Data Package: Urban Heat Island Mitigation Layer Set' },
    ],
    publications: [
      {
        outputType: 'Publication',
        title: 'Spatiotemporal Analysis of Land Surface Temperature Dynamics in Greater Cairo Using Multi-Sensor Thermal Imagery',
        authors: ['Zaki, W.H.', 'Abdel-Aziz, S.I.', 'Soliman, N.T.'],
        journalOrPublisher: 'Urban Climate – Elsevier',
        doi: '10.1016/j.uclim.2024.101852',
        status: 'Published',
        date: '2024-06-01',
      },
    ],
  },

  {
    title: 'Red Sea Coastal Erosion Monitoring & Shoreline Change Analysis',
    description: 'Long-term monitoring of shoreline dynamics along the Egyptian Red Sea coast using multi-temporal satellite imagery, bathymetric surveys, and hydrodynamic modeling to assess erosion rates, deposition patterns, and the impact of infrastructure development on coastal morphology.',
    startDate: '2024-06-01',
    endDate: '2027-05-31',
    budget: 6200000,
    fundingSource: 'Egyptian Ministry of Environment & UNDP Blue Economy Initiative',
    status: 'Active',
    pi: users['ahmed.elsayed@narss.sci.eg'].id,
    teamMembers: [
      { userId: users['kareem.aly@narss.sci.eg'].id, role: 'Researcher' },
      { userId: users['nourhan.soliman@narss.sci.eg'].id, role: 'Researcher' },
      { userId: users['tarek.alghamdi@ksa.partner.eg'].id, role: 'Contributor' },
    ],
    reports: [
      { title: 'Baseline Coastal Morphology Survey – Red Sea Southern Sector', reportType: 'Periodic', deadline: '2024-09-30', status: 'Completed' },
      { title: 'Year-1 Erosion Rate Quantification Report', reportType: 'Periodic', deadline: '2025-06-30', status: 'In Progress' },
      { title: 'Semi-Annual Bathymetric Update', reportType: 'Semi-Final', deadline: '2025-12-31', status: 'Pending' },
    ],
    expenses: [
      { category: 'Equipment', amount: 1450000, description: 'Multibeam echosounder system, RTK-GPS survey vessel, and sonar transducers', date: '2024-06-20', status: 'Approved' },
      { category: 'Travel', amount: 175000, description: 'Marine survey expeditions: Hurghada, Marsa Alam, and Safaga sectors', date: '2024-08-10', status: 'Approved' },
      { category: 'Personnel', amount: 620000, description: 'Marine survey team and GIS analysts – Year 1 compensation', date: '2024-12-31', status: 'Pending' },
      { category: 'Subcontracting', amount: 340000, description: 'Hydrodynamic modelling – Alexandria University Oceanography Dept.', date: '2024-09-01', status: 'Pending' },
    ],
    documents: [
      { fileName: 'RedSea_Coastal_Project_Proposal_v1.pdf', category: 'Proposal', docContent: 'RED SEA COASTAL EROSION MONITORING PROJECT PROPOSAL\n\nThis document presents the comprehensive scientific methodology for long-term shoreline change analysis across 1,200 km of the Egyptian Red Sea coastline using high-resolution satellite imagery and field survey data.' },
    ],
    publications: [
      {
        outputType: 'Dataset',
        title: 'Egyptian Red Sea Shoreline Change Database 2000–2023: Multi-Temporal Satellite-Derived Coastal Transects',
        authors: ['El-Sayed, A.M.', 'Aly, K.Y.'],
        journalOrPublisher: 'PANGAEA Data Publisher – NARSS Data Repository',
        doi: '10.1594/PANGAEA.964112',
        status: 'Published',
        date: '2024-07-30',
      },
    ],
  },

  {
    title: 'Desert Encroachment Early Warning System – Western Desert Periphery',
    description: 'Development of a near real-time sand dune migration detection and desert encroachment early warning system using SAR (Synthetic Aperture Radar) coherence change detection and wind regime modeling, targeting agricultural areas along the Nile Valley-Desert boundary.',
    startDate: '2023-03-01',
    endDate: '2024-12-31',
    budget: 1850000,
    fundingSource: 'Arab Fund for Economic and Social Development (AFESD)',
    status: 'Completed',
    pi: users['walid.zaki@narss.sci.eg'].id,
    teamMembers: [
      { userId: users['heba.farouk@narss.sci.eg'].id, role: 'Lead' },
      { userId: users['dina.mahmoud@narss.sci.eg'].id, role: 'Researcher' },
    ],
    reports: [
      { title: 'Phase 1 SAR Data Acquisition & Preprocessing', reportType: 'Periodic', deadline: '2023-06-30', status: 'Completed' },
      { title: 'Sand Dune Migration Rate Analysis – Kharga & Dakhla Oases', reportType: 'Periodic', deadline: '2023-12-31', status: 'Completed' },
      { title: 'Early Warning System Prototype Validation', reportType: 'Semi-Final', deadline: '2024-06-30', status: 'Completed' },
      { title: 'Final Scientific and Technical Report – DEWS', reportType: 'Final', deadline: '2024-11-30', status: 'Completed' },
    ],
    expenses: [
      { category: 'Equipment', amount: 320000, description: 'SAR data licenses and Sentinel-1 archive subscriptions – ESA', date: '2023-03-15', status: 'Approved' },
      { category: 'Personnel', amount: 480000, description: 'Full project duration personnel costs – 2 researchers + 1 software engineer', date: '2024-12-01', status: 'Approved' },
      { category: 'Overhead', amount: 95000, description: 'HPC cluster computation time for InSAR processing pipeline', date: '2024-01-10', status: 'Approved' },
      { category: 'Travel', amount: 67000, description: 'Field validation campaign – 4 Western Desert sites', date: '2023-09-05', status: 'Approved' },
      { category: 'Other', amount: 28000, description: 'Scientific publication open-access fees – 2 journals', date: '2024-10-01', status: 'Approved' },
    ],
    documents: [
      { fileName: 'DEWS_Final_Technical_Report_2024.pdf', category: 'Report', docContent: 'DESERT ENCROACHMENT EARLY WARNING SYSTEM\nFinal Technical Report – December 2024\n\nProject Summary:\nThis report documents the complete development, validation, and deployment of a SAR-based near real-time early warning system for sand dune encroachment monitoring. The system achieved 94.3% detection accuracy with an average alert lead time of 18 days.' },
      { fileName: 'DEWS_Financial_Audit_Report_AFESD.pdf', category: 'Financial', docContent: 'FINANCIAL AUDIT REPORT\nProject: Desert Encroachment Early Warning System\nFunding Body: Arab Fund for Economic and Social Development\n\nTotal Approved Budget: EGP 1,850,000\nTotal Expenditure: EGP 1,727,400\nUnspent Balance: EGP 122,600\n\nAudit Status: CLEARED' },
    ],
    publications: [
      {
        outputType: 'Publication',
        title: 'SAR Coherence Change Detection for Real-Time Sand Dune Migration Monitoring in Arid Regions: A Case Study from the Egyptian Western Desert',
        authors: ['Zaki, W.H.', 'Farouk, H.N.', 'Mahmoud, D.F.'],
        journalOrPublisher: 'ISPRS Journal of Photogrammetry and Remote Sensing',
        doi: '10.1016/j.isprsjprs.2024.07.015',
        status: 'Published',
        date: '2024-08-20',
      },
      {
        outputType: 'Patent',
        title: 'Method and System for Near Real-Time Desert Encroachment Detection Using Differential SAR Coherence Analysis',
        authors: ['Zaki, W.H.', 'Farouk, H.N.'],
        journalOrPublisher: 'Egyptian Patent Office',
        doi: 'EGY-PAT-2024-RS-4471',
        status: 'Granted',
        date: '2024-11-01',
      },
    ],
  },
];

// ─── Main Seeder ───────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║       NARSS Dashboard — Full Data Seeder                ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 1. Admin login
  console.log('Step 1: Authenticating as Admin...');
  let adminToken;
  const loginRes = await post('/auth/login', { email: 'admin@narss.gov.eg', password: 'Password123!' });
  if (loginRes.token) {
    adminToken = loginRes.token;
    console.log('  ✓ Admin login successful');
  } else {
    // Try registering admin
    const regRes = await post('/auth/register', {
      name: 'System Administrator',
      email: 'admin@narss.gov.eg',
      password: 'Password123!',
      role: 'Admin',
    });
    adminToken = regRes.token;
    console.log('  ✓ Admin registered and authenticated');
  }

  // 2. Create users
  console.log('\nStep 2: Creating team members...');
  const userMap = {}; // email → { id, token }

  for (const u of USERS) {
    const res = await post('/auth/register', u);
    if (res.user) {
      userMap[u.email] = { id: res.user.id || res.user._id, token: res.token };
      console.log(`  ✓ ${u.name} (${u.role})`);
    } else {
      // Already exists — fetch from users list
      const allRes = await fetch(`${BASE}/auth/users?limit=all`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then(r => r.json());
      const existing = (allRes.users || []).find(x => x.email === u.email);
      if (existing) {
        const loginR = await post('/auth/login', { email: u.email, password: u.password });
        userMap[u.email] = { id: existing._id || existing.id, token: loginR.token };
        console.log(`  ↺ ${u.name} already exists — reused`);
      }
    }
  }

  // 3. Create projects
  console.log('\nStep 3: Creating research projects...');
  const projectDefs = PROJECTS(userMap);

  for (const proj of projectDefs) {
    // Pick PI token (fallback to admin)
    const piEntry = Object.values(userMap).find(u => u.id === proj.pi);
    const piToken = piEntry?.token || adminToken;

    // Create project
    const pRes = await post('/projects', {
      title: proj.title,
      description: proj.description,
      startDate: proj.startDate,
      endDate: proj.endDate,
      budget: proj.budget,
      fundingSource: proj.fundingSource,
      status: proj.status,
      pi: proj.pi,
    }, adminToken);

    if (!pRes.success) {
      console.log(`  ✗ Failed to create project: ${proj.title.substring(0, 60)}...`);
      console.log('    Error:', pRes.message);
      continue;
    }

    const projectId = pRes.project._id || pRes.project.id;
    console.log(`\n  ✓ Project: ${proj.title.substring(0, 65)}...`);
    console.log(`    ID: ${projectId}`);

    // Add team members
    for (const member of proj.teamMembers) {
      if (!member.userId) continue;
      const mRes = await post(`/projects/${projectId}/members`, { userId: member.userId, role: member.role }, adminToken);
      if (mRes.success) console.log(`    + Member added: ${member.role}`);
    }

    // Add reports with file attachments
    console.log(`    Adding ${proj.reports.length} reports...`);
    for (const report of proj.reports) {
      // Create a realistic PDF for each report
      const pdfPath = makePdf(
        `report_${Date.now()}.pdf`,
        report.title,
        `Project: ${proj.title}\nReport Type: ${report.reportType}\nStatus: ${report.status}\nDeadline: ${report.deadline}\n\nThis report covers the scientific progress and findings for the corresponding period.`
      );

      const form = new FormData();
      form.append('title', report.title);
      form.append('reportType', report.reportType);
      form.append('deadline', report.deadline);
      form.append('status', report.status);
      form.append('file', fs.createReadStream(pdfPath), {
        filename: `${report.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40)}.pdf`,
        contentType: 'application/pdf',
      });

      const rRes = await postForm(`/projects/${projectId}/reports`, form, adminToken);
      if (rRes.success) {
        console.log(`    ✓ Report: ${report.title.substring(0, 55)}...`);
      } else {
        console.log(`    ✗ Report failed: ${rRes.message}`);
      }
    }

    // Log expenses
    console.log(`    Adding ${proj.expenses.length} expenses...`);
    for (const exp of proj.expenses) {
      const eRes = await post('/expenses', {
        project: projectId,
        category: exp.category,
        amount: exp.amount,
        description: exp.description,
        date: exp.date,
        status: exp.status,
      }, adminToken);

      if (eRes.success || eRes._id) {
        // Approve if status is Approved
        if (exp.status === 'Approved' && eRes.expense?._id) {
          await put(`/expenses/${eRes.expense._id}`, { status: 'Approved' }, adminToken);
        }
        console.log(`    ✓ Expense: ${exp.category} – EGP ${exp.amount.toLocaleString()}`);
      } else {
        console.log(`    ✗ Expense failed: ${eRes.message}`);
      }
    }

    // Upload documents
    console.log(`    Adding ${proj.documents.length} documents...`);
    for (const doc of proj.documents) {
      const ext = path.extname(doc.fileName).toLowerCase();
      let docPath;
      if (ext === '.zip') {
        docPath = makeTxt(doc.fileName.replace('.zip', '.txt'), doc.docContent);
      } else {
        docPath = makePdf(`doc_${Date.now()}.pdf`, doc.fileName.replace('.pdf', ''), doc.docContent);
      }

      const dForm = new FormData();
      dForm.append('project', projectId);
      dForm.append('category', doc.category);
      dForm.append('file', fs.createReadStream(docPath), {
        filename: doc.fileName,
        contentType: ext === '.zip' ? 'text/plain' : 'application/pdf',
      });

      const dRes = await postForm('/documents', dForm, adminToken);
      if (dRes.success) {
        console.log(`    ✓ Document: ${doc.fileName}`);
      } else {
        console.log(`    ✗ Document failed: ${dRes.message}`);
      }
    }

    // Add publications
    console.log(`    Adding ${proj.publications.length} publications...`);
    for (const pub of proj.publications) {
      const pubRes = await post('/publications', {
        project: projectId,
        outputType: pub.outputType,
        title: pub.title,
        authors: pub.authors,
        journalOrPublisher: pub.journalOrPublisher,
        externalIdentifiers: { doi: pub.doi || '' },
        publicationDate: pub.date,
        status: pub.status,
      }, adminToken);

      if (pubRes.success) {
        console.log(`    ✓ ${pub.outputType}: ${pub.title.substring(0, 60)}...`);
      } else {
        console.log(`    ✗ Publication failed: ${pubRes.message}`);
      }
    }
  }

  // Cleanup temp files
  cleanup();

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   ✅ Seeding Complete! Refresh the dashboard to view.   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

seed().catch(err => {
  cleanup();
  console.error('\n✗ Fatal seeding error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
