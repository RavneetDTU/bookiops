import { db } from '../config/firebase.js';

/** BookiOps workflow collections — never tenants / phoneIndex / callLogs. */
export const col = {
  adminUsers: () => db.collection('ops_adminUsers'),
  adminUsersByEmail: () => db.collection('ops_adminUsersByEmail'),
  restaurantAuth: () => db.collection('ops_restaurantAuth'),
  onboarding: () => db.collection('ops_onboardingRequests'),
  idempotency: () => db.collection('ops_idempotency'),
  directory: () => db.collection('ops_restaurantDirectory'),
  numberChanges: () => db.collection('ops_numberChangeRequests'),
  pendingNumberChange: () => db.collection('ops_pendingNumberChange'),
  auditLogs: () => db.collection('ops_auditLogs'),
};

export { db };

export function nowIso() {
  return new Date().toISOString();
}

export function toRow(snap) {
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getDoc(collectionFn, id) {
  if (!id) return null;
  const snap = await collectionFn().doc(String(id)).get();
  return toRow(snap);
}

export async function listAll(collectionFn) {
  const snap = await collectionFn().get();
  return snap.docs.map(toRow);
}

export function sortByDesc(rows, field) {
  return [...rows].sort((a, b) => String(b[field] || '').localeCompare(String(a[field] || '')));
}
