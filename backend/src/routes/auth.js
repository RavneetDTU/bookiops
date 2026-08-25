import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { col, getDoc, nowIso } from '../db/store.js';
import { requireAdmin, signAdminToken, signRestaurantToken } from '../middleware/auth.js';
import { writeAudit } from '../services/auditService.js';
import { config } from '../config/env.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const emailIdx = await getDoc(col.adminUsersByEmail, email);
    const admin = emailIdx?.id ? await getDoc(col.adminUsers, emailIdx.id) : null;
    if (!admin || !admin.is_active) {
      await writeAudit({
        actorType: 'admin',
        action: 'admin.login',
        result: 'failure',
        newValue: { email },
        ip: req.ip,
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) {
      await writeAudit({
        actorType: 'admin',
        action: 'admin.login',
        result: 'failure',
        newValue: { email },
        ip: req.ip,
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await col.adminUsers().doc(admin.id).update({ last_login_at: nowIso() });
    const token = signAdminToken(admin);
    await writeAudit({
      adminUserId: admin.id,
      actorType: 'admin',
      action: 'admin.login',
      result: 'success',
      ip: req.ip,
    });

    return res.json({
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      expiresIn: config.adminJwtExpiresIn,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', requireAdmin, async (req, res) => {
  await writeAudit({
    adminUserId: req.admin.id,
    actorType: 'admin',
    action: 'admin.logout',
    result: 'success',
    ip: req.ip,
  });
  return res.json({ ok: true });
});

router.get('/me', requireAdmin, async (req, res) => {
  return res.json({ user: req.admin });
});

/**
 * C1: Restaurant session for number-change ingest.
 * Verifies against restaurant_auth_subjects — NOT admin_users.
 * Does not trust client restaurantId; restaurant_id comes from subject row.
 */
router.post('/restaurant-session', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const row = await getDoc(col.restaurantAuth, email);
    if (!row || !row.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signRestaurantToken({
      subject: row.subject,
      restaurantId: row.restaurant_id,
    });

    return res.json({
      token,
      restaurantId: row.restaurant_id,
      expiresIn: config.restaurantJwtExpiresIn,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Session failed' });
  }
});

export default router;
