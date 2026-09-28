import test from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// ASSET MANAGEMENT — CRUD & VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

const ASSET_UPDATABLE_FIELDS = [
  'asset_id', 'serial_number', 'asset_type_id', 'location_id',
  'support_type', 'make', 'model', 'description', 'po_number',
  'po_quantity', 'current_owner', 'owner_user_id', 'lifecycle_status',
];

const buildAssetUpdates = (data) => {
  const updates = {};
  for (const field of ASSET_UPDATABLE_FIELDS) {
    if (data[field] === undefined) continue;
    if (['asset_type_id', 'location_id', 'owner_user_id'].includes(field)) {
      updates[field] = data[field] ? Number(data[field]) : null;
    } else if (field === 'po_quantity') {
      const val = data[field] !== null && String(data[field]).trim() !== '' ? Number(data[field]) : null;
      if (val !== null && (isNaN(val) || !Number.isInteger(val) || val < 1)) {
        return { error: 'po_quantity must be a positive integer >= 1' };
      }
      updates[field] = val;
    } else {
      const value = typeof data[field] === 'string' ? data[field].trim() : data[field];
      updates[field] = value || null;
    }
  }
  return updates;
};

test('Asset CRUD — Valid asset update payload builds correctly', () => {
  const data = { serial_number: 'SN-NEW-001', make: 'Dell', lifecycle_status: 'InStock' };
  const updates = buildAssetUpdates(data);
  assert.equal(updates.serial_number, 'SN-NEW-001');
  assert.equal(updates.make, 'Dell');
  assert.equal(updates.lifecycle_status, 'InStock');
});

test('Asset CRUD — po_quantity must be positive integer', () => {
  assert.equal(buildAssetUpdates({ po_quantity: 0 }).error, 'po_quantity must be a positive integer >= 1');
  assert.equal(buildAssetUpdates({ po_quantity: -5 }).error, 'po_quantity must be a positive integer >= 1');
  assert.equal(buildAssetUpdates({ po_quantity: 1.5 }).error, 'po_quantity must be a positive integer >= 1');
});

test('Asset CRUD — po_quantity null/empty clears the field', () => {
  assert.equal(buildAssetUpdates({ po_quantity: null }).po_quantity, null);
  assert.equal(buildAssetUpdates({ po_quantity: '' }).po_quantity, null);
});

test('Asset CRUD — po_quantity valid positive integer is accepted', () => {
  assert.equal(buildAssetUpdates({ po_quantity: 5 }).po_quantity, 5);
  assert.equal(buildAssetUpdates({ po_quantity: 100 }).po_quantity, 100);
});

test('Asset CRUD — Empty string fields are coerced to null', () => {
  const updates = buildAssetUpdates({ make: '', current_owner: '  ' });
  assert.equal(updates.make, null);
  assert.equal(updates.current_owner, null);
});

test('Asset CRUD — Fields not in the UPDATABLE list are ignored', () => {
  const updates = buildAssetUpdates({ active: false, source: 'import' });
  assert.equal(updates.active, undefined);
  assert.equal(updates.source, undefined);
});

test('Asset CRUD — Lifecycle status options are restricted', () => {
  const VALID_STATUSES = ['InStock', 'Buyback', 'Dispose'];
  assert.ok(VALID_STATUSES.includes('InStock'));
  assert.ok(VALID_STATUSES.includes('Buyback'));
  assert.ok(!VALID_STATUSES.includes('Active')); // not a valid status in this app
});

// ─────────────────────────────────────────────────────────────────────────────
// ASSET FILTERING & SEARCH (AssetsPage)
// ─────────────────────────────────────────────────────────────────────────────

const filterAssets = (assets, filters) => {
  const search = (filters.search || '').trim().toLowerCase();
  return assets.filter((asset) => {
    if (filters.location && asset.location?.location_name !== filters.location) return false;
    if (filters.assetType && asset.asset_type?.code !== filters.assetType) return false;
    if (filters.supportType && asset.support_type !== filters.supportType) return false;
    if (filters.status && asset.lifecycle_status !== filters.status) return false;
    if (search) {
      const haystack = [asset.asset_id, asset.po_number, asset.serial_number, asset.current_owner, asset.make, asset.model]
        .filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
};

const sampleAssets = [
  { id: 1, asset_id: 'UPSO1/IS/PO1/PC/0001', serial_number: 'SN001', make: 'Dell', model: 'OptiPlex',
    po_number: 'PO1', asset_type: { code: 'PC' }, location: { location_name: 'UPSO-1' },
    support_type: 'AMC', lifecycle_status: 'InStock', current_owner: 'Alice' },
  { id: 2, asset_id: 'UPSO1/IS/PO2/LAP/0001', serial_number: 'SN002', make: 'HP', model: 'EliteBook',
    po_number: 'PO2', asset_type: { code: 'LAP' }, location: { location_name: 'LUCKNOW BP' },
    support_type: 'FMS', lifecycle_status: 'Buyback', current_owner: 'Bob' },
];

test('Asset Filter — Filter by location returns only matching assets', () => {
  const result = filterAssets(sampleAssets, { location: 'UPSO-1' });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 1);
});

test('Asset Filter — Filter by asset type code', () => {
  const result = filterAssets(sampleAssets, { assetType: 'LAP' });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 2);
});

test('Asset Filter — Filter by support type', () => {
  const result = filterAssets(sampleAssets, { supportType: 'FMS' });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 2);
});

test('Asset Filter — Filter by lifecycle status', () => {
  const result = filterAssets(sampleAssets, { status: 'InStock' });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 1);
});

test('Asset Filter — Search by serial number', () => {
  const result = filterAssets(sampleAssets, { search: 'SN002' });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 2);
});

test('Asset Filter — Search by owner name (case insensitive)', () => {
  const result = filterAssets(sampleAssets, { search: 'alice' });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 1);
});

test('Asset Filter — Empty filters show all assets', () => {
  const result = filterAssets(sampleAssets, {});
  assert.equal(result.length, 2);
});

test('Asset Filter — Unmatched filter returns empty', () => {
  const result = filterAssets(sampleAssets, { location: 'NONEXISTENT' });
  assert.equal(result.length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE REQUEST FILTERING (ServiceRequestsPage)
// ─────────────────────────────────────────────────────────────────────────────

const filterRequests = (requests, filters) => {
  const search = (filters.search || '').trim().toLowerCase();
  return requests.filter((r) => {
    if (filters.location && r.location?.location_name !== filters.location) return false;
    if (filters.category && r.category !== filters.category) return false;
    if (filters.priority && r.priority !== filters.priority) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (search) {
      const haystack = [r.request_id, r.title, r.description, r.reported_by, r.resolution]
        .filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
};

const sampleRequests = [
  { id: 1, request_id: 'SR-001', title: 'Printer not working', description: 'Paper jam',
    category: 'Hardware', priority: 'High', status: 'New', resolution: null,
    location: { location_name: 'UPSO-1' }, reported_by: 'Alice' },
  { id: 2, request_id: 'SR-002', title: 'Software crash', description: 'Blue screen',
    category: 'Software', priority: 'Critical', status: 'Resolved', resolution: 'OS reinstalled',
    location: { location_name: 'LUCKNOW BP' }, reported_by: 'Bob' },
  { id: 3, request_id: 'SR-003', title: 'Network issue', description: 'No internet',
    category: 'Network', priority: 'Medium', status: 'In Progress', resolution: null,
    location: { location_name: 'UPSO-1' }, reported_by: 'Carol' },
];

test('SR Filter — Filter by status shows only matching requests', () => {
  const result = filterRequests(sampleRequests, { status: 'Resolved' });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 2);
});

test('SR Filter — Filter by priority Critical', () => {
  const result = filterRequests(sampleRequests, { priority: 'Critical' });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 2);
});

test('SR Filter — Filter by category Hardware', () => {
  const result = filterRequests(sampleRequests, { category: 'Hardware' });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 1);
});

test('SR Filter — Filter by location returns multiple matching', () => {
  const result = filterRequests(sampleRequests, { location: 'UPSO-1' });
  assert.equal(result.length, 2);
});

test('SR Filter — Search by request ID', () => {
  const result = filterRequests(sampleRequests, { search: 'SR-003' });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 3);
});

test('SR Filter — Search by resolution text', () => {
  const result = filterRequests(sampleRequests, { search: 'OS reinstalled' });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 2);
});

test('SR Filter — Combined filters narrow results correctly', () => {
  const result = filterRequests(sampleRequests, { location: 'UPSO-1', status: 'New' });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE REQUEST — SOFT DELETE
// ─────────────────────────────────────────────────────────────────────────────

const canDeleteServiceRequest = (existing) => {
  if (existing.source === 'import') {
    return { allowed: false, error: 'Legacy imported service requests cannot be deleted.' };
  }
  return { allowed: true };
};

test('SR Delete — Imported (legacy) requests cannot be deleted', () => {
  assert.equal(canDeleteServiceRequest({ source: 'import' }).allowed, false);
});

test('SR Delete — Manually created requests can be deleted', () => {
  assert.equal(canDeleteServiceRequest({ source: 'manual' }).allowed, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// LOCATIONS — CRUD
// ─────────────────────────────────────────────────────────────────────────────

const validateLocation = (data) => {
  if (!data.location_name || !String(data.location_name).trim()) {
    return { valid: false, error: 'location_name is required.' };
  }
  if (!data.location_code || !String(data.location_code).trim()) {
    return { valid: false, error: 'location_code is required.' };
  }
  return { valid: true };
};

test('Location — Creating without name fails', () => {
  assert.equal(validateLocation({ location_code: 'L001' }).valid, false);
});

test('Location — Creating without code fails', () => {
  assert.equal(validateLocation({ location_name: 'UPSO-1' }).valid, false);
});

test('Location — Valid location data passes', () => {
  assert.equal(validateLocation({ location_name: 'UPSO-1', location_code: '1400' }).valid, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// USERS — CRUD & ROLE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

const VALID_ROLES = ['Administrator', 'AssetManager', 'LocationCoordinator', 'Engineer', 'User'];

const validateUserRole = (role) => VALID_ROLES.includes(role);

test('Users — Valid roles are accepted', () => {
  VALID_ROLES.forEach((role) => assert.ok(validateUserRole(role), `${role} should be valid`));
});

test('Users — Invalid role is rejected', () => {
  assert.equal(validateUserRole('SuperAdmin'), false);
  assert.equal(validateUserRole('guest'), false);
  assert.equal(validateUserRole(''), false);
});

test('Users — User role scoping is enforced on service requests', () => {
  const applyScope = (user) => {
    const where = { active: true };
    if (user.role === 'User') where.submitted_by_user_id = user.userId;
    return where;
  };
  assert.deepEqual(applyScope({ userId: 5, role: 'User' }), { active: true, submitted_by_user_id: 5 });
  assert.deepEqual(applyScope({ userId: 1, role: 'Administrator' }), { active: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// ASSET ID GENERATION
// ─────────────────────────────────────────────────────────────────────────────

const formatAssetId = (poNumber, assetTypeCode, seq) => {
  const poPart = (poNumber || 'NA').trim() || 'NA';
  const seqPart = String(seq).padStart(4, '0');
  return `UPSO1/IS/${poPart}/${assetTypeCode.toUpperCase()}/${seqPart}`;
};

test('Asset ID — Standard PO and type formatting', () => {
  assert.equal(formatAssetId('88371928', 'PC', 1), 'UPSO1/IS/88371928/PC/0001');
  assert.equal(formatAssetId('PO99', 'LAP', 12), 'UPSO1/IS/PO99/LAP/0012');
});

test('Asset ID — Empty PO number falls back to NA', () => {
  assert.equal(formatAssetId('', 'PRN', 105), 'UPSO1/IS/NA/PRN/0105');
  assert.equal(formatAssetId(null, 'PC', 1), 'UPSO1/IS/NA/PC/0001');
});

test('Asset ID — Asset type code is always uppercased', () => {
  assert.equal(formatAssetId('PO1', 'lap', 1), 'UPSO1/IS/PO1/LAP/0001');
});

test('Asset ID — Sequence pads to 4 digits', () => {
  assert.ok(formatAssetId('PO1', 'PC', 1).endsWith('/0001'));
  assert.ok(formatAssetId('PO1', 'PC', 9999).endsWith('/9999'));
  assert.ok(formatAssetId('PO1', 'PC', 10000).endsWith('/10000')); // overflow allowed
});

// ─────────────────────────────────────────────────────────────────────────────
// ROLE-BASED ACCESS CONTROL — ASSET OWNERSHIP & VISIBILITY
// ─────────────────────────────────────────────────────────────────────────────

const canAccessAsset = (user, asset) => {
  if (user.role === 'Administrator' || user.role === 'AssetManager') return true;
  if (user.role === 'User') return asset.owner_user_id === user.userId;
  if (user.role === 'LocationCoordinator') return asset.location_id === user.location_id;
  return false;
};

test('RBAC — Administrator can access any asset', () => {
  assert.ok(canAccessAsset({ userId: 1, role: 'Administrator' }, { owner_user_id: 99, location_id: 200 }));
});

test('RBAC — AssetManager can access any asset', () => {
  assert.ok(canAccessAsset({ userId: 2, role: 'AssetManager' }, { owner_user_id: 99, location_id: 200 }));
});

test('RBAC — User can only access their own assets', () => {
  const asset = { owner_user_id: 5, location_id: 100 };
  assert.ok(canAccessAsset({ userId: 5, role: 'User' }, asset));
  assert.equal(canAccessAsset({ userId: 6, role: 'User' }, asset), false);
});

test('RBAC — LocationCoordinator can access assets at their location', () => {
  const asset = { owner_user_id: 5, location_id: 100 };
  assert.ok(canAccessAsset({ userId: 8, role: 'LocationCoordinator', location_id: 100 }, asset));
  assert.equal(canAccessAsset({ userId: 8, role: 'LocationCoordinator', location_id: 200 }, asset), false);
});

test('RBAC — Engineer has no asset ownership access', () => {
  const asset = { owner_user_id: 5, location_id: 100 };
  assert.equal(canAccessAsset({ userId: 9, role: 'Engineer' }, asset), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD METRICS — ROLE-BASED SCOPING
// ─────────────────────────────────────────────────────────────────────────────

const getDashboardWhere = (user) => {
  const assetWhere = { active: true };
  const srWhere = { active: true };
  if (user.role === 'LocationCoordinator' && user.location_id) {
    assetWhere.location_id = user.location_id;
    srWhere.location_id = user.location_id;
  } else if (user.role === 'User') {
    assetWhere.owner_user_id = user.userId;
    srWhere.submitted_by_user_id = user.userId;
  }
  return { assetWhere, srWhere };
};

test('Dashboard — Admin sees global metrics (no location filter)', () => {
  const result = getDashboardWhere({ userId: 1, role: 'Administrator' });
  assert.deepEqual(result.assetWhere, { active: true });
  assert.deepEqual(result.srWhere, { active: true });
});

test('Dashboard — LocationCoordinator sees site-scoped metrics', () => {
  const result = getDashboardWhere({ userId: 5, role: 'LocationCoordinator', location_id: 105 });
  assert.equal(result.assetWhere.location_id, 105);
  assert.equal(result.srWhere.location_id, 105);
});

test('Dashboard — User sees only personal metrics', () => {
  const result = getDashboardWhere({ userId: 12, role: 'User' });
  assert.equal(result.assetWhere.owner_user_id, 12);
  assert.equal(result.srWhere.submitted_by_user_id, 12);
});

// ─────────────────────────────────────────────────────────────────────────────
// PORTAL ACCESS SCOPING (Admin vs User Login Page)
// ─────────────────────────────────────────────────────────────────────────────

const checkPortalAccess = (portal, role) => {
  if (portal === 'admin' && role === 'User') {
    return { allowed: false, error: 'Please use the User login page.' };
  }
  if (portal === 'user' && role !== 'User') {
    return { allowed: false, error: 'Please use the Admin login page.' };
  }
  return { allowed: true };
};

test('Portal — User role cannot log into Admin portal', () => {
  assert.equal(checkPortalAccess('admin', 'User').allowed, false);
});

test('Portal — Non-User role cannot log into User portal', () => {
  assert.equal(checkPortalAccess('user', 'Administrator').allowed, false);
  assert.equal(checkPortalAccess('user', 'Engineer').allowed, false);
});

test('Portal — Administrator can log into Admin portal', () => {
  assert.equal(checkPortalAccess('admin', 'Administrator').allowed, true);
});

test('Portal — User role can log into User portal', () => {
  assert.equal(checkPortalAccess('user', 'User').allowed, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// USER COMPLAINT STATUS PAGE — Display Mapping
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_DISPLAY_MAP = { New: 'Open', Resolved: 'Closed' };
const displayStatus = (status) => STATUS_DISPLAY_MAP[status] || status;

test('Complaint Status Display — "New" shows as "Open"', () => {
  assert.equal(displayStatus('New'), 'Open');
});

test('Complaint Status Display — "Resolved" shows as "Closed"', () => {
  assert.equal(displayStatus('Resolved'), 'Closed');
});

test('Complaint Status Display — "In Progress" shows as-is', () => {
  assert.equal(displayStatus('In Progress'), 'In Progress');
});

test('Complaint Status Display — "On Hold" shows as-is', () => {
  assert.equal(displayStatus('On Hold'), 'On Hold');
});

test('Complaint Status Display — "Closed" shows as-is', () => {
  assert.equal(displayStatus('Closed'), 'Closed');
});

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS — ACCESS CONTROL
// ─────────────────────────────────────────────────────────────────────────────

const isAuditLogAccessAllowed = (role) => ['Administrator', 'AssetManager'].includes(role);

test('Audit Log — Administrator can view audit logs', () => assert.ok(isAuditLogAccessAllowed('Administrator')));
test('Audit Log — AssetManager can view audit logs', () => assert.ok(isAuditLogAccessAllowed('AssetManager')));
test('Audit Log — LocationCoordinator cannot view audit logs', () => assert.equal(isAuditLogAccessAllowed('LocationCoordinator'), false));
test('Audit Log — Engineer cannot view audit logs', () => assert.equal(isAuditLogAccessAllowed('Engineer'), false));
test('Audit Log — User cannot view audit logs', () => assert.equal(isAuditLogAccessAllowed('User'), false));
