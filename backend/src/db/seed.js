import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { connectFirestore } from '../config/firebase.js';
import { col, nowIso } from './store.js';

/** Existing mybooki mock restaurant owners — for restaurant JWT ingest. */
const SEED_RESTAURANT_SUBJECTS = [
  { subject: 'billy@gmail.com', password: 'billy@123', restaurantId: '1' },
  { subject: 'ryan@gmail.com', password: 'ryan@123', restaurantId: '2' },
  { subject: 'bjorn@gmail.com', password: 'bjorn@123', restaurantId: '3' },
  { subject: 'wine@gmail.com', password: 'wine@123', restaurantId: '4' },
  { subject: 'reservations@lapetitemaisonrestaurant.co.za', password: 'qsdcwe@@!$', restaurantId: '5' },
];

export async function seedDefaults() {
  const email = config.seedAdminEmail.toLowerCase();
  const emailSnap = await col.adminUsersByEmail().doc(email).get();
  if (!emailSnap.exists) {
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(config.seedAdminPassword, 12);
    await col.adminUsers().doc(id).set({
      email,
      password_hash: passwordHash,
      name: config.seedAdminName,
      role: 'superadmin',
      is_active: true,
      created_at: nowIso(),
      last_login_at: null,
    });
    await col.adminUsersByEmail().doc(email).set({ id });
    console.log(`Seeded admin user ${email}`);
  }

  for (const row of SEED_RESTAURANT_SUBJECTS) {
    const subject = row.subject.toLowerCase();
    const existing = await col.restaurantAuth().doc(subject).get();
    if (existing.exists) continue;
    const hash = await bcrypt.hash(row.password, 12);
    await col.restaurantAuth().doc(subject).set({
      subject,
      password_hash: hash,
      restaurant_id: row.restaurantId,
      is_active: true,
      created_at: nowIso(),
      rotated_at: null,
    });
  }
}

async function main() {
  await connectFirestore();
  await seedDefaults();
  console.log('BookiOps Firestore seed complete');
}

const isDirect =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirect) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
