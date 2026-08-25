import { v4 as uuidv4 } from 'uuid';
import { col, db, nowIso } from '../db/store.js';

export async function writeAudit({
  adminUserId = null,
  actorType,
  action,
  entityType = null,
  entityId = null,
  restaurantId = null,
  previousValue = null,
  newValue = null,
  result,
  ip = null,
}) {
  await col.auditLogs().doc(uuidv4()).set({
    admin_user_id: adminUserId,
    actor_type: actorType,
    action,
    entity_type: entityType,
    entity_id: entityId,
    restaurant_id: restaurantId,
    previous_value: previousValue == null ? null : previousValue,
    new_value: newValue == null ? null : newValue,
    result,
    ip,
    created_at: nowIso(),
  });
}

export { db };
