import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import * as onboarding from '../services/onboardingService.js';

const router = Router();

router.post('/ingest/onboarding-requests', async (req, res) => {
  try {
    const idempotencyKey =
      req.get('Idempotency-Key') || req.body?.idempotencyKey || null;
    const { request, created } = await onboarding.createOnboardingRequest(req.body || {}, {
      idempotencyKey,
      ip: req.ip,
    });
    return res.status(created ? 201 : 200).json({
      id: request.id,
      status: request.status,
      created,
      message: created ? 'Onboarding request recorded' : 'Existing onboarding request returned',
    });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Failed' });
  }
});

router.post('/ingest/onboarding-requests/:id/register-sync', async (req, res) => {
  try {
    const { registrationId, status, error } = req.body || {};
    if (!['succeeded', 'failed', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'status must be succeeded|failed|pending' });
    }
    await onboarding.markRegisterSync(req.params.id, {
      registrationId,
      status,
      error,
    });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/admin/onboarding-requests', requireAdmin, async (req, res) => {
  try {
    const rows = await onboarding.listOnboardingRequests({ status: req.query.status });
    return res.json({ requests: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/admin/onboarding-requests/:id', requireAdmin, async (req, res) => {
  try {
    const row = await onboarding.getOnboardingRequest(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json({ request: row });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/admin/onboarding-requests/:id/reject', requireAdmin, async (req, res) => {
  try {
    const row = await onboarding.rejectOnboarding(
      req.params.id,
      req.admin,
      req.body?.reason,
      req.ip
    );
    return res.json({ request: row });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/admin/onboarding-requests/:id/approve', requireAdmin, async (req, res) => {
  try {
    const createPayload = req.body?.createPayload;
    if (!createPayload?.restaurantId) {
      return res.status(400).json({
        error: 'createPayload with restaurantId (and create fields) is required',
      });
    }
    const data = await onboarding.approveOnboarding(
      req.params.id,
      req.admin,
      createPayload,
      req.ip
    );
    return res.status(201).json({ restaurant: data });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message, details: err.data });
  }
});

router.post('/admin/restaurants/onboard', requireAdmin, async (req, res) => {
  try {
    const data = await onboarding.onboardRestaurantDirect(req.body, req.admin, req.ip, null);
    return res.status(201).json({
      message: 'Restaurant created successfully',
      restaurantId: data.restaurantId,
      name: data.name,
      phoneNumbers: data.phoneNumbers,
    });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message, details: err.data });
  }
});

router.get('/admin/dashboard/summary', requireAdmin, async (_req, res) => {
  try {
    const summary = await onboarding.getDashboardSummary();
    return res.json(summary);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
