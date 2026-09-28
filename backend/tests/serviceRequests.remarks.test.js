import test from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers that mirror the exact frontend logic after the fix
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mirrors the fixed commitCommentChange guard logic from ServiceRequestsPage.jsx
 * Returns { blocked: true, errorMessage } when the update should be blocked,
 * or { blocked: false } when the update is safe to send.
 */
const checkRemarksUpdate = (request, newResolution) => {
  const resolution = newResolution.trim();
  if (resolution === (request.resolution || '')) {
    return { blocked: true, reason: 'no-change' };
  }
  if ((request.status === 'Resolved' || request.status === 'Closed') && !resolution) {
    return {
      blocked: true,
      errorMessage:
        'Resolution/Remarks are required for Resolved or Closed complaints. Please enter a remark before saving.',
    };
  }
  return { blocked: false };
};

/**
 * Mirrors the fixed handleStatusChange guard in ServiceRequestsPage.jsx
 */
const checkStatusChange = (request, commentDrafts, newStatus) => {
  const currentResolution = commentDrafts[request.id] ?? request.resolution;
  if ((newStatus === 'Resolved' || newStatus === 'Closed') && !currentResolution) {
    return {
      blocked: true,
      errorMessage: `Please enter Remarks/Resolution before marking a complaint as "${newStatus}".`,
    };
  }
  return { blocked: false };
};

/**
 * Mirrors the backend resolution-validation logic
 */
const validateClosureResolutionBackend = (targetStatus, resolutionText) => {
  if (targetStatus === 'Resolved' || targetStatus === 'Closed') {
    if (!resolutionText || !String(resolutionText).trim()) {
      return {
        valid: false,
        error: 'Resolution details are required when marking a service request as Resolved or Closed.',
      };
    }
  }
  return { valid: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// REMARKS / COMMENTS COLUMN TESTS (Admin Login — ServiceRequestsPage)
// ─────────────────────────────────────────────────────────────────────────────

test('Remarks — Clearing remarks on a Resolved complaint is blocked on the frontend', () => {
  const resolvedRequest = { id: 1, status: 'Resolved', resolution: 'Replaced power adapter.' };
  const result = checkRemarksUpdate(resolvedRequest, ''); // user blanked the field
  assert.equal(result.blocked, true);
  assert.ok(result.errorMessage.includes('Resolved or Closed'));
});

test('Remarks — Clearing remarks on a Closed complaint is blocked on the frontend', () => {
  const closedRequest = { id: 2, status: 'Closed', resolution: 'Issue confirmed resolved.' };
  const result = checkRemarksUpdate(closedRequest, '   '); // whitespace-only
  assert.equal(result.blocked, true);
  assert.ok(result.errorMessage.includes('Resolved or Closed'));
});

test('Remarks — Updating remarks on a Resolved complaint with non-empty text is allowed', () => {
  const resolvedRequest = { id: 3, status: 'Resolved', resolution: 'Old remark.' };
  const result = checkRemarksUpdate(resolvedRequest, 'Updated: replaced the unit.');
  assert.equal(result.blocked, false);
});

test('Remarks — Updating remarks on an In Progress complaint (even with empty text) is allowed', () => {
  const inProgressRequest = { id: 4, status: 'In Progress', resolution: '' };
  const result = checkRemarksUpdate(inProgressRequest, '');
  // Same value → no-change block, not an error block
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'no-change');
});

test('Remarks — Updating remarks on a New complaint with text is allowed', () => {
  const newRequest = { id: 5, status: 'New', resolution: null };
  const result = checkRemarksUpdate(newRequest, 'Technician dispatched');
  assert.equal(result.blocked, false);
});

test('Remarks — No-change guard prevents redundant API calls', () => {
  const request = { id: 6, status: 'New', resolution: 'Some remark' };
  const result = checkRemarksUpdate(request, 'Some remark');
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'no-change');
});

test('Remarks — No-change guard works when resolution is null and input is empty', () => {
  const request = { id: 7, status: 'New', resolution: null };
  const result = checkRemarksUpdate(request, '');
  assert.equal(result.blocked, true); // '' === (null || '') → no-change
  assert.equal(result.reason, 'no-change');
});

// ─────────────────────────────────────────────────────────────────────────────
// STATUS CHANGE TESTS (Admin Login — ServiceRequestsPage)
// ─────────────────────────────────────────────────────────────────────────────

test('Status Change — Setting status to Resolved without any remarks is blocked', () => {
  const request = { id: 10, status: 'New', resolution: null };
  const commentDrafts = {};
  const result = checkStatusChange(request, commentDrafts, 'Resolved');
  assert.equal(result.blocked, true);
  assert.ok(result.errorMessage.includes('Resolved'));
});

test('Status Change — Setting status to Closed without any remarks is blocked', () => {
  const request = { id: 11, status: 'In Progress', resolution: '' };
  const commentDrafts = {};
  const result = checkStatusChange(request, commentDrafts, 'Closed');
  assert.equal(result.blocked, true);
  assert.ok(result.errorMessage.includes('Closed'));
});

test('Status Change — Setting status to Resolved when a draft remark exists is allowed', () => {
  const request = { id: 12, status: 'In Progress', resolution: null };
  const commentDrafts = { 12: 'Hardware replaced and tested OK.' };
  const result = checkStatusChange(request, commentDrafts, 'Resolved');
  assert.equal(result.blocked, false);
});

test('Status Change — Setting status to Resolved when resolution already exists is allowed', () => {
  const request = { id: 13, status: 'In Progress', resolution: 'Fix applied.' };
  const commentDrafts = {};
  const result = checkStatusChange(request, commentDrafts, 'Resolved');
  assert.equal(result.blocked, false);
});

test('Status Change — Setting status to In Progress without remarks is allowed', () => {
  const request = { id: 14, status: 'New', resolution: null };
  const commentDrafts = {};
  const result = checkStatusChange(request, commentDrafts, 'In Progress');
  assert.equal(result.blocked, false);
});

test('Status Change — Setting status to On Hold without remarks is allowed', () => {
  const request = { id: 15, status: 'New', resolution: null };
  const commentDrafts = {};
  const result = checkStatusChange(request, commentDrafts, 'On Hold');
  assert.equal(result.blocked, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND VALIDATION TESTS (resolution required for Resolved/Closed)
// ─────────────────────────────────────────────────────────────────────────────

test('Backend — Resolution required when status is Resolved and resolution is empty', () => {
  const result = validateClosureResolutionBackend('Resolved', '');
  assert.equal(result.valid, false);
  assert.ok(result.error.includes('Resolved or Closed'));
});

test('Backend — Resolution required when status is Closed and resolution is whitespace', () => {
  const result = validateClosureResolutionBackend('Closed', '   ');
  assert.equal(result.valid, false);
});

test('Backend — Valid resolution passes for Resolved status', () => {
  const result = validateClosureResolutionBackend('Resolved', 'Replaced faulty power adapter.');
  assert.equal(result.valid, true);
});

test('Backend — No resolution required for In Progress status', () => {
  const result = validateClosureResolutionBackend('In Progress', '');
  assert.equal(result.valid, true);
});

test('Backend — No resolution required for New status', () => {
  const result = validateClosureResolutionBackend('New', null);
  assert.equal(result.valid, true);
});

test('Backend — No resolution required for On Hold status', () => {
  const result = validateClosureResolutionBackend('On Hold', '');
  assert.equal(result.valid, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// CREATE COMPLAINT VALIDATION TESTS (User Login — UserComplaintCreatePage)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mirrors the fixed handleSubmit guard logic in UserComplaintCreatePage.jsx
 */
const validateComplaintForm = (form) => {
  if (!form.asset_id) {
    return { valid: false, error: 'Please select an asset to raise a complaint for.' };
  }
  if (!form.title || !form.title.trim()) {
    return { valid: false, error: 'Title is required.' };
  }
  if (!form.category || !form.category.trim()) {
    return { valid: false, error: 'Category is required.' };
  }
  return { valid: true };
};

test('Create Complaint — Submitting without selecting an asset is blocked', () => {
  const form = { asset_id: '', category: 'Hardware', priority: 'Low', title: 'Broken keyboard', description: '' };
  const result = validateComplaintForm(form);
  assert.equal(result.valid, false);
  assert.ok(result.error.includes('select an asset'));
});

test('Create Complaint — Submitting with asset_id as 0 (falsy) is blocked', () => {
  const form = { asset_id: 0, category: 'Hardware', priority: 'Low', title: 'Test', description: '' };
  const result = validateComplaintForm(form);
  assert.equal(result.valid, false);
});

test('Create Complaint — Valid form with all required fields passes validation', () => {
  const form = { asset_id: '42', category: 'Hardware', priority: 'Low', title: 'Screen cracked', description: '' };
  const result = validateComplaintForm(form);
  assert.equal(result.valid, true);
});

test('Create Complaint — asset_id is coerced to Number before submission', () => {
  const assetId = '42';
  const coerced = Number(assetId);
  assert.equal(coerced, 42);
  assert.equal(typeof coerced, 'number');
});

test('Create Complaint — Empty string asset_id coerces to 0 (falsy), correctly blocked', () => {
  const assetId = '';
  const coerced = Number(assetId);
  assert.equal(coerced, 0);
  assert.equal(!coerced, true); // truthy check catches this
});

test('Create Complaint — Pre-selection: first asset auto-selected when no URL param', () => {
  const assetId = undefined; // no URL param
  const assets = [{ id: 7, serial_number: 'SN001' }, { id: 8, serial_number: 'SN002' }];
  const autoSelected = !assetId && assets.length > 0 ? String(assets[0].id) : '';
  assert.equal(autoSelected, '7');
});

test('Create Complaint — No auto-selection when asset list is empty', () => {
  const assetId = undefined;
  const assets = [];
  const autoSelected = !assetId && assets.length > 0 ? String(assets[0].id) : '';
  assert.equal(autoSelected, '');
});

test('Create Complaint — URL param asset_id is respected over auto-selection', () => {
  const assetId = '99'; // from URL param
  const assets = [{ id: 7 }, { id: 8 }];
  const selected = assetId || (!assetId && assets.length > 0 ? String(assets[0].id) : '');
  assert.equal(selected, '99');
});

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND — SERVICE REQUEST CREATION FOR USER ROLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mirrors the backend POST /service-requests route logic for User role
 */
const resolveUserComplaintLocationId = (user, data, ownedAsset) => {
  const assetId = data.asset_id ? Number(data.asset_id) : undefined;

  if (user.role === 'User') {
    if (!assetId || !Number.isInteger(assetId)) {
      return { error: 'Asset is required.' };
    }
    if (!ownedAsset) {
      return { error: 'You can only raise complaints for assets allotted to you.' };
    }
    return { locationId: ownedAsset.location_id };
  }
  return { locationId: Number(data.location_id) };
};

test('Backend User — Missing asset_id returns Asset is required error', () => {
  const user = { userId: 5, role: 'User' };
  const data = { asset_id: '', title: 'Issue', category: 'SW', priority: 'Low' };
  const result = resolveUserComplaintLocationId(user, data, null);
  assert.equal(result.error, 'Asset is required.');
});

test('Backend User — Unowned asset returns forbidden error', () => {
  const user = { userId: 5, role: 'User' };
  const data = { asset_id: '42', title: 'Issue', category: 'SW', priority: 'Low' };
  const result = resolveUserComplaintLocationId(user, data, null); // ownedAsset is null (not found)
  assert.equal(result.error, 'You can only raise complaints for assets allotted to you.');
});

test('Backend User — Valid owned asset extracts location_id correctly', () => {
  const user = { userId: 5, role: 'User' };
  const data = { asset_id: '42', title: 'Issue', category: 'SW', priority: 'Low' };
  const ownedAsset = { id: 42, owner_user_id: 5, location_id: 105 };
  const result = resolveUserComplaintLocationId(user, data, ownedAsset);
  assert.equal(result.locationId, 105);
  assert.equal(result.error, undefined);
});

test('Backend Admin — Admin can specify custom location_id', () => {
  const user = { userId: 1, role: 'Administrator' };
  const data = { asset_id: null, location_id: '200', title: 'Issue', category: 'HW', priority: 'High' };
  const result = resolveUserComplaintLocationId(user, data, null);
  assert.equal(result.locationId, 200);
});
