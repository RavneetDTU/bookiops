import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import * as onboarding from '../services/onboardingService.js';
import { writeAudit } from '../services/auditService.js';

const router = Router();

router.get('/admin/restaurants', requireAdmin, async (req, res) => {
  try {
    const rows = await onboarding.listDirectory();
    const lastSynced = rows.reduce((max, r) => {
      if (!r.synced_at) return max;
      const t = new Date(r.synced_at).getTime();
      return t > max ? t : max;
    }, 0);
    return res.json({
      restaurants: rows,
      lastSyncedAt: lastSynced ? new Date(lastSynced).toISOString() : null,
      stale: lastSynced ? Date.now() - lastSynced > 24 * 60 * 60 * 1000 : true,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/admin/restaurants/sync', requireAdmin, async (req, res) => {
  try {
    const result = await onboarding.syncRestaurantDirectory();
    await writeAudit({
      adminUserId: req.admin.id,
      actorType: 'admin',
      action: 'restaurant_directory.sync',
      result: 'success',
      newValue: result,
      ip: req.ip,
    });
    return res.json(result);
  } catch (err) {
    await writeAudit({
      adminUserId: req.admin.id,
      actorType: 'admin',
      action: 'restaurant_directory.sync',
      result: 'failure',
      newValue: { error: err.message },
      ip: req.ip,
    });
    return res.status(err.status || 502).json({ error: err.message });
  }
});

export default router;
