import { Router } from 'express';
import { requireAdmin, requireRestaurant } from '../middleware/auth.js';
import * as numberChange from '../services/numberChangeService.js';

const router = Router();

router.post('/ingest/number-change-requests', requireRestaurant, async (req, res) => {
  try {
    // restaurantId from JWT only — ignore body.restaurantId for authz
    const requestedNumber = req.body?.requestedNumber || req.body?.phoneNumber;
    const row = await numberChange.createNumberChangeRequest({
      restaurantId: req.restaurant.restaurantId,
      subject: req.restaurant.subject,
      requestedNumber,
      ip: req.ip,
    });
    return res.status(201).json({ request: row });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/ingest/number-change-requests/current', requireRestaurant, async (req, res) => {
  try {
    const row = await numberChange.getPendingForRestaurant(req.restaurant.restaurantId);
    return res.json({ request: row });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/admin/number-change-requests', requireAdmin, async (req, res) => {
  try {
    const rows = await numberChange.listNumberChangeRequests({ status: req.query.status });
    return res.json({ requests: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/admin/number-change-requests/:id/approve', requireAdmin, async (req, res) => {
  try {
    const row = await numberChange.approveNumberChange(req.params.id, req.admin, req.ip);
    return res.json({ request: row });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/admin/number-change-requests/:id/reject', requireAdmin, async (req, res) => {
  try {
    const row = await numberChange.rejectNumberChange(
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

export default router;
