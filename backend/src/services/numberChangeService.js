import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { writeAudit } from './auditService.js';
import * as phoneClient from './phoneClient.js';
import { col, db, getDoc, listAll, nowIso, sortByDesc } from '../db/store.js';

function primaryPhone(details) {
  const phones = details?.phoneNumbers;
  if (Array.isArray(phones) && phones.length) return String(phones[0]);
  return '';
}

export async function createNumberChangeRequest({ restaurantId, subject, requestedNumber, ip }) {
  const cleaned = String(requestedNumber || '').trim();
  if (!cleaned) {
    const err = new Error('requestedNumber is required');
    err.status = 400;
    throw err;
  }

  const { ok, status, data } = await phoneClient.getRestaurantDetails(restaurantId);
  if (!ok) {
    const err = new Error(data?.error || `Restaurant not found (${status})`);
    err.status = status === 404 ? 404 : 502;
    throw err;
  }

  const currentNumber = primaryPhone(data);
  if (!currentNumber) {
    const err = new Error('Restaurant has no current phone number configured');
    err.status = 400;
    throw err;
  }
  if (currentNumber === cleaned) {
    const err = new Error('Requested number is the same as the current number');
    err.status = 400;
    throw err;
  }

  const id = uuidv4();
  const row = {
    restaurant_id: restaurantId,
    restaurant_name_snapshot: data.name || null,
    current_number: currentNumber,
    requested_number: cleaned,
    status: 'pending',
    requested_at: nowIso(),
    requester_subject: subject,
    reviewed_at: null,
    reviewed_by: null,
    rejection_reason: null,
    phone_update_status: 'not_attempted',
    phone_update_error: null,
    phone_update_attempts: 0,
  };

  try {
    await db.runTransaction(async (t) => {
      const pendingRef = col.pendingNumberChange().doc(restaurantId);
      const pending = await t.get(pendingRef);
      if (pending.exists) {
        const err = new Error('A pending number change request already exists for this restaurant');
        err.status = 409;
        throw err;
      }
      t.set(col.numberChanges().doc(id), row);
      t.set(pendingRef, { requestId: id, created_at: nowIso() });
    });
  } catch (err) {
    if (err.status === 409) throw err;
    throw err;
  }

  await writeAudit({
    actorType: 'restaurant_ingest',
    action: 'number_change_request.create',
    entityType: 'number_change_request',
    entityId: id,
    restaurantId,
    previousValue: { current_number: currentNumber },
    newValue: { requested_number: cleaned },
    result: 'success',
    ip,
  });

  return { id, ...row };
}

export async function getPendingForRestaurant(restaurantId) {
  const pending = await getDoc(col.pendingNumberChange, restaurantId);
  if (!pending?.requestId) return null;
  return getDoc(col.numberChanges, pending.requestId);
}

export async function listNumberChangeRequests({ status } = {}) {
  let rows = await listAll(col.numberChanges);
  if (status) rows = rows.filter((r) => r.status === status);
  return sortByDesc(rows, 'requested_at');
}

export async function rejectNumberChange(id, admin, reason, ip) {
  const existing = await getDoc(col.numberChanges, id);
  if (!existing || existing.status !== 'pending') {
    const err = new Error('Request not found or not pending');
    err.status = 409;
    throw err;
  }

  const reviewedAt = nowIso();
  await db.runTransaction(async (t) => {
    const ref = col.numberChanges().doc(id);
    const snap = await t.get(ref);
    if (!snap.exists || snap.data().status !== 'pending') {
      const err = new Error('Request not found or not pending');
      err.status = 409;
      throw err;
    }
    t.update(ref, {
      status: 'rejected',
      reviewed_at: reviewedAt,
      reviewed_by: admin.id,
      rejection_reason: reason || null,
    });
    t.delete(col.pendingNumberChange().doc(existing.restaurant_id));
  });

  const updated = {
    ...existing,
    status: 'rejected',
    reviewed_at: reviewedAt,
    reviewed_by: admin.id,
    rejection_reason: reason || null,
  };

  await writeAudit({
    adminUserId: admin.id,
    actorType: 'admin',
    action: 'number_change_request.reject',
    entityType: 'number_change_request',
    entityId: id,
    restaurantId: existing.restaurant_id,
    result: 'success',
    newValue: { rejection_reason: reason || null },
    ip,
  });
  return updated;
}

async function markApproved(id, row, admin, extraUpdates) {
  const reviewedAt = nowIso();
  let approved = null;
  await db.runTransaction(async (t) => {
    const ref = col.numberChanges().doc(id);
    const snap = await t.get(ref);
    if (!snap.exists) {
      const err = new Error('Request not found');
      err.status = 404;
      throw err;
    }
    const current = snap.data();
    if (current.status === 'approved') {
      approved = { id, ...current };
      return;
    }
    if (current.status !== 'pending') {
      const err = new Error(`Cannot approve request in status ${current.status}`);
      err.status = 409;
      throw err;
    }
    const updates = {
      status: 'approved',
      reviewed_at: reviewedAt,
      reviewed_by: admin.id,
      phone_update_status: 'succeeded',
      phone_update_error: null,
      phone_update_attempts: (current.phone_update_attempts || 0) + 1,
      ...extraUpdates,
    };
    t.update(ref, updates);
    t.delete(col.pendingNumberChange().doc(row.restaurant_id));
    approved = { id, ...current, ...updates };
  });
  return approved;
}

/**
 * Approve with reconcile-before-write and only mark approved after phone success.
 */
export async function approveNumberChange(id, admin, ip) {
  const row = await getDoc(col.numberChanges, id);
  if (!row) {
    const err = new Error('Request not found');
    err.status = 404;
    throw err;
  }
  if (row.status === 'approved') return row;
  if (row.status !== 'pending') {
    const err = new Error(`Cannot approve request in status ${row.status}`);
    err.status = 409;
    throw err;
  }

  const details = await phoneClient.getRestaurantDetails(row.restaurant_id);
  if (details.ok) {
    const live = primaryPhone(details.data);
    if (live && live === row.requested_number) {
      const done = await markApproved(id, row, admin, {});
      await writeAudit({
        adminUserId: admin.id,
        actorType: 'admin',
        action: 'number_change_request.approve_reconcile',
        entityType: 'number_change_request',
        entityId: id,
        restaurantId: row.restaurant_id,
        previousValue: { current_number: row.current_number },
        newValue: { requested_number: row.requested_number, reconciled: true },
        result: 'success',
        ip,
      });
      await col.directory().doc(row.restaurant_id).set(
        { phone_numbers: [row.requested_number], synced_at: nowIso() },
        { merge: true }
      );
      return done;
    }
  }

  const patch = await phoneClient.updateRestaurantPhoneNumber(
    row.restaurant_id,
    row.requested_number
  );

  if (!patch.ok) {
    // Note: parameter `admin` shadows firebase-admin import — use a plain counter here.
    await col.numberChanges().doc(id).update({
      phone_update_status: 'failed',
      phone_update_error: patch.data?.error || `Phone update failed (${patch.status})`,
      phone_update_attempts: (row.phone_update_attempts || 0) + 1,
    });
    await writeAudit({
      adminUserId: admin.id,
      actorType: 'admin',
      action: 'number_change_request.approve',
      entityType: 'number_change_request',
      entityId: id,
      restaurantId: row.restaurant_id,
      result: 'failure',
      newValue: { error: patch.data?.error, status: patch.status },
      ip,
    });
    const err = new Error(patch.data?.error || 'Phone number update failed');
    err.status = 502;
    throw err;
  }

  const approved = await markApproved(id, row, admin, {});
  if (!approved) {
    const err = new Error('Request was no longer pending');
    err.status = 409;
    throw err;
  }

  await col.directory().doc(row.restaurant_id).set(
    {
      phone_numbers: patch.data.phoneNumbers || [row.requested_number],
      synced_at: nowIso(),
    },
    { merge: true }
  );

  await writeAudit({
    adminUserId: admin.id,
    actorType: 'admin',
    action: 'number_change_request.approve',
    entityType: 'number_change_request',
    entityId: id,
    restaurantId: row.restaurant_id,
    previousValue: {
      current_number: row.current_number,
      previousPhoneNumbers: patch.data.previousPhoneNumbers,
    },
    newValue: { requested_number: row.requested_number, phoneNumbers: patch.data.phoneNumbers },
    result: 'success',
    ip,
  });

  return approved;
}
