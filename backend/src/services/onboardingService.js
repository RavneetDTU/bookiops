import { v4 as uuidv4 } from 'uuid';
import { writeAudit } from './auditService.js';
import * as phoneClient from './phoneClient.js';
import { col, db, getDoc, listAll, nowIso, sortByDesc } from '../db/store.js';

export async function syncRestaurantDirectory() {
  const { ok, status, data } = await phoneClient.listRestaurantsInternal();
  if (!ok) {
    const err = new Error(data?.error || `Phone list API failed (${status})`);
    err.status = status;
    throw err;
  }

  const restaurants = data.restaurants || [];
  const syncedAt = data.syncedAt || nowIso();

  for (const r of restaurants) {
    const restaurantId = String(r.restaurantId);
    const existing = await getDoc(col.directory, restaurantId);
    await col.directory().doc(restaurantId).set(
      {
        restaurant_id: restaurantId,
        name: r.name || null,
        email: r.email || null,
        phone_numbers: r.phoneNumbers || [],
        is_active: r.isActive !== false,
        created_at_source: r.createdAt || existing?.created_at_source || null,
        synced_at: syncedAt,
        source_onboarding_request_id: existing?.source_onboarding_request_id || null,
      },
      { merge: true }
    );
  }

  return { count: restaurants.length, syncedAt };
}

export async function listDirectory() {
  const rows = await listAll(col.directory);
  return rows.sort((a, b) => String(a.restaurant_id).localeCompare(String(b.restaurant_id)));
}

export async function upsertDirectoryFromCreate(tenant, onboardingRequestId = null) {
  const restaurantId = String(tenant.restaurantId);
  const existing = await getDoc(col.directory, restaurantId);
  await col.directory().doc(restaurantId).set(
    {
      restaurant_id: restaurantId,
      name: tenant.name || null,
      email: tenant.email || null,
      phone_numbers: tenant.phoneNumbers || [],
      is_active: true,
      synced_at: nowIso(),
      source_onboarding_request_id:
        onboardingRequestId || existing?.source_onboarding_request_id || null,
    },
    { merge: true }
  );
}

export async function createOnboardingRequest(body, { idempotencyKey, ip }) {
  const {
    name,
    email,
    restaurantName,
    restaurantEmail,
    restaurantPhone,
    restaurantAddress,
    contactName,
    contactPhone,
    contactEmail,
    verificationDocUrl = null,
    source = 'public_signup',
  } = body;

  const required = {
    name,
    email,
    restaurantName,
    restaurantEmail,
    restaurantPhone,
    restaurantAddress,
    contactName,
    contactPhone,
    contactEmail,
  };
  for (const [k, v] of Object.entries(required)) {
    if (!v || !String(v).trim()) {
      const err = new Error(`Missing required field: ${k}`);
      err.status = 400;
      throw err;
    }
  }

  if (body.password || body.confirmPassword) {
    // never persist passwords
  }

  const id = uuidv4();
  const row = {
    registration_id: null,
    status: 'pending',
    applicant_name: String(name).trim(),
    applicant_email: String(email).trim().toLowerCase(),
    restaurant_name: String(restaurantName).trim(),
    restaurant_email: String(restaurantEmail).trim(),
    restaurant_phone: String(restaurantPhone).trim(),
    restaurant_address: String(restaurantAddress).trim(),
    contact_name: String(contactName).trim(),
    contact_phone: String(contactPhone).trim(),
    contact_email: String(contactEmail).trim(),
    verification_doc_url: verificationDocUrl,
    assigned_restaurant_id: null,
    source,
    register_sync_status: 'pending',
    register_sync_error: null,
    idempotency_key: idempotencyKey || null,
    submitted_at: nowIso(),
    reviewed_at: null,
    reviewed_by: null,
    rejection_reason: null,
  };

  if (!idempotencyKey) {
    await col.onboarding().doc(id).set(row);
    await writeAudit({
      actorType: 'restaurant_ingest',
      action: 'onboarding_request.create',
      entityType: 'onboarding_request',
      entityId: id,
      newValue: { restaurant_name: row.restaurant_name, applicant_email: row.applicant_email },
      result: 'success',
      ip,
    });
    return { request: { id, ...row }, created: true };
  }

  let created = false;
  let existingId = null;
  await db.runTransaction(async (t) => {
    const idxRef = col.idempotency().doc(idempotencyKey);
    const idx = await t.get(idxRef);
    if (idx.exists) {
      existingId = idx.data().requestId;
      return;
    }
    t.set(col.onboarding().doc(id), row);
    t.set(idxRef, { requestId: id, created_at: nowIso() });
    created = true;
  });

  if (!created) {
    const existing = await getDoc(col.onboarding, existingId);
    return { request: existing, created: false };
  }

  await writeAudit({
    actorType: 'restaurant_ingest',
    action: 'onboarding_request.create',
    entityType: 'onboarding_request',
    entityId: id,
    newValue: { restaurant_name: row.restaurant_name, applicant_email: row.applicant_email },
    result: 'success',
    ip,
  });
  return { request: { id, ...row }, created: true };
}

export async function markRegisterSync(requestId, { registrationId, status, error }) {
  const existing = await getDoc(col.onboarding, requestId);
  if (!existing) {
    const err = new Error('Request not found');
    err.status = 404;
    throw err;
  }
  await col.onboarding().doc(requestId).update({
    registration_id: registrationId || existing.registration_id || null,
    register_sync_status: status,
    register_sync_error: error || null,
  });
}

export async function listOnboardingRequests({ status } = {}) {
  let rows = await listAll(col.onboarding);
  if (status) rows = rows.filter((r) => r.status === status);
  return sortByDesc(rows, 'submitted_at');
}

export async function getOnboardingRequest(id) {
  return getDoc(col.onboarding, id);
}

export async function rejectOnboarding(id, admin, reason, ip) {
  const existing = await getDoc(col.onboarding, id);
  if (!existing || existing.status !== 'pending') {
    const err = new Error('Request not found or not pending');
    err.status = 409;
    throw err;
  }
  const updated = {
    ...existing,
    status: 'rejected',
    reviewed_at: nowIso(),
    reviewed_by: admin.id,
    rejection_reason: reason || null,
  };
  await col.onboarding().doc(id).update({
    status: 'rejected',
    reviewed_at: updated.reviewed_at,
    reviewed_by: admin.id,
    rejection_reason: reason || null,
  });
  await writeAudit({
    adminUserId: admin.id,
    actorType: 'admin',
    action: 'onboarding_request.reject',
    entityType: 'onboarding_request',
    entityId: id,
    result: 'success',
    newValue: { rejection_reason: reason || null },
    ip,
  });
  return updated;
}

export async function onboardRestaurantDirect(payload, admin, ip, onboardingRequestId = null) {
  const { ok, status, data } = await phoneClient.createRestaurant(payload);
  if (!ok) {
    await writeAudit({
      adminUserId: admin.id,
      actorType: 'admin',
      action: 'restaurant.onboard',
      entityType: 'restaurant',
      entityId: payload.restaurantId,
      restaurantId: payload.restaurantId,
      result: 'failure',
      newValue: { error: data?.error || data?.message, status },
      ip,
    });
    const err = new Error(data?.error || data?.message || 'Failed to create restaurant');
    err.status = status || 500;
    err.data = data;
    throw err;
  }

  await upsertDirectoryFromCreate(
    {
      restaurantId: data.restaurantId,
      name: data.name,
      email: payload.email,
      phoneNumbers: data.phoneNumbers,
    },
    onboardingRequestId
  );

  if (onboardingRequestId) {
    await col.onboarding().doc(onboardingRequestId).update({
      status: 'onboarded',
      assigned_restaurant_id: data.restaurantId,
      reviewed_at: nowIso(),
      reviewed_by: admin.id,
    });
  }

  await writeAudit({
    adminUserId: admin.id,
    actorType: 'admin',
    action: 'restaurant.onboard',
    entityType: 'restaurant',
    entityId: data.restaurantId,
    restaurantId: data.restaurantId,
    result: 'success',
    newValue: { restaurantId: data.restaurantId, name: data.name },
    ip,
  });

  return data;
}

export async function approveOnboarding(id, admin, createPayload, ip) {
  const reqRow = await getOnboardingRequest(id);
  if (!reqRow) {
    const err = new Error('Request not found');
    err.status = 404;
    throw err;
  }
  if (reqRow.status !== 'pending' && reqRow.status !== 'approved') {
    const err = new Error(`Cannot approve request in status ${reqRow.status}`);
    err.status = 409;
    throw err;
  }

  await col.onboarding().doc(id).update({
    status: 'approved',
    reviewed_at: nowIso(),
    reviewed_by: admin.id,
  });

  return onboardRestaurantDirect(createPayload, admin, ip, id);
}

export async function getDashboardSummary() {
  const [onboarding, directory, numberChanges] = await Promise.all([
    listAll(col.onboarding),
    listAll(col.directory),
    listAll(col.numberChanges),
  ]);

  const recentOnboarding = sortByDesc(onboarding, 'submitted_at')
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      restaurant_name: r.restaurant_name,
      status: r.status,
      submitted_at: r.submitted_at,
    }));

  const recentNumberChanges = sortByDesc(numberChanges, 'requested_at')
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      restaurant_id: r.restaurant_id,
      restaurant_name_snapshot: r.restaurant_name_snapshot,
      status: r.status,
      requested_at: r.requested_at,
    }));

  let lastDirectorySyncAt = null;
  for (const r of directory) {
    if (!r.synced_at) continue;
    if (!lastDirectorySyncAt || String(r.synced_at) > String(lastDirectorySyncAt)) {
      lastDirectorySyncAt = r.synced_at;
    }
  }

  return {
    pendingOnboarding: onboarding.filter((r) => r.status === 'pending').length,
    totalRestaurants: directory.length,
    pendingNumberChanges: numberChanges.filter((r) => r.status === 'pending').length,
    lastDirectorySyncAt,
    recentOnboarding,
    recentNumberChanges,
  };
}
