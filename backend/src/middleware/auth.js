import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { col, getDoc } from '../db/store.js';

export function signAdminToken(admin) {
  return jwt.sign(
    {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      iss: 'bookiops-admin',
      aud: 'bookiops-admin',
    },
    config.adminJwtSecret,
    { expiresIn: config.adminJwtExpiresIn }
  );
}

export function signRestaurantToken({ subject, restaurantId }) {
  return jwt.sign(
    {
      sub: subject,
      restaurant_id: restaurantId,
      iss: 'bookiops-restaurant',
      aud: 'bookiops-restaurant',
    },
    config.restaurantJwtSecret,
    { expiresIn: config.restaurantJwtExpiresIn }
  );
}

export async function requireAdmin(req, res, next) {
  try {
    const header = req.get('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    let payload;
    try {
      payload = jwt.verify(token, config.adminJwtSecret, {
        issuer: 'bookiops-admin',
        audience: 'bookiops-admin',
      });
    } catch {
      return res.status(401).json({ error: 'Invalid or expired admin token' });
    }

    const admin = await getDoc(col.adminUsers, payload.sub);
    if (!admin || !admin.is_active) {
      return res.status(401).json({ error: 'Admin inactive or not found' });
    }
    if (!['admin', 'superadmin'].includes(admin.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.admin = admin;
    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Auth error' });
  }
}

export async function requireRestaurant(req, res, next) {
  try {
    const header = req.get('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    let payload;
    try {
      payload = jwt.verify(token, config.restaurantJwtSecret, {
        issuer: 'bookiops-restaurant',
        audience: 'bookiops-restaurant',
      });
    } catch {
      return res.status(401).json({ error: 'Invalid or expired restaurant token' });
    }

    const restaurantId = payload.restaurant_id;
    if (!restaurantId) {
      return res.status(401).json({ error: 'Invalid restaurant token claims' });
    }

    const subjectRow = await getDoc(col.restaurantAuth, String(payload.sub).toLowerCase());
    if (!subjectRow || !subjectRow.is_active || subjectRow.restaurant_id !== restaurantId) {
      return res.status(401).json({ error: 'Restaurant subject inactive or not found' });
    }

    // Identity bound from verified JWT — never from body.restaurantId
    req.restaurant = {
      subject: subjectRow.subject,
      restaurantId: subjectRow.restaurant_id,
    };
    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Auth error' });
  }
}
