import { createRequire } from 'module';
import dotenv from 'dotenv';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { dirname, isAbsolute, join } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const require = createRequire(import.meta.url);
const { initializeFirestore } = require('firebase-admin/firestore');

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: join(backendRoot, '.env') });

function findCredentialFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /firebase-adminsdk.*\.json$/i.test(f))
    .map((f) => join(dir, f));
}

function loadServiceAccount() {
  const envPath = process.env.FIREBASE_CREDENTIALS_PATH;
  if (envPath) {
    const resolved = isAbsolute(envPath) ? envPath : join(backendRoot, envPath);
    if (!existsSync(resolved)) {
      throw new Error(`FIREBASE_CREDENTIALS_PATH not found: ${resolved}`);
    }
    return JSON.parse(readFileSync(resolved, 'utf8'));
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const cleaned = process.env.FIREBASE_SERVICE_ACCOUNT.replace(/\r?\n/g, '').trim();
    return JSON.parse(cleaned);
  }

  const searchDirs = [
    backendRoot,
    join(backendRoot, 'src'),
    join(backendRoot, 'src', 'config'),
  ];
  const matches = searchDirs.flatMap(findCredentialFiles);
  if (matches.length === 1) {
    console.log(`🔑 Firebase credentials: ${matches[0]}`);
    return JSON.parse(readFileSync(matches[0], 'utf8'));
  }
  if (matches.length > 1) {
    throw new Error(
      'Multiple *firebase-adminsdk*.json files found. Set FIREBASE_CREDENTIALS_PATH to one of them.'
    );
  }

  throw new Error(
    'Firebase credentials not found. Place the bookiops *firebase-adminsdk*.json in backend/ or backend/src/.'
  );
}

function databaseIdFromName(name = '') {
  const parts = String(name).split('/');
  return decodeURIComponent(parts[parts.length - 1] || name);
}

const serviceAccount = loadServiceAccount();
export const firebaseProjectId = serviceAccount.project_id;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  console.log(`✅ Firebase Admin initialized (project: ${serviceAccount.project_id})`);
}

/** Assigned in connectFirestore() before seed. */
export let db;

async function listDatabasesRest() {
  const cred = admin.app().options.credential;
  const { access_token } = await cred.getAccessToken();
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

function pickDatabaseId(summaries) {
  const override = process.env.FIRESTORE_DATABASE_ID;
  if (override) return override;
  const ids = summaries.map((s) => s.id);
  if (ids.includes('(default)')) return '(default)';
  if (ids.includes('default')) return 'default';
  const native = summaries.find((s) => /NATIVE/i.test(String(s.type || '')));
  if (native) return native.id;
  return ids[0];
}

export async function connectFirestore() {
  const listed = await listDatabasesRest();
  if (!listed.ok) {
    throw new Error(
      `Could not list Firestore databases for project "${firebaseProjectId}" (HTTP ${listed.status}). Enable the Cloud Firestore API in Google Cloud for this project. Response: ${JSON.stringify(listed.body).slice(0, 400)}`
    );
  }

  const databases = listed.body.databases || [];
  const summaries = databases.map((d) => ({
    id: databaseIdFromName(d.name),
    type: d.type,
    location: d.locationId,
    edition: d.databaseEdition,
  }));
  console.log(
    `📦 Firestore databases: ${summaries.length ? JSON.stringify(summaries) : '(none)'}`
  );

  if (summaries.length === 0) {
    throw new Error(
      `No Firestore database exists in project "${firebaseProjectId}". In Firebase Console → Firestore click Create database, choose Native mode (not MongoDB compatibility), then restart.`
    );
  }

  const databaseId = pickDatabaseId(summaries);
  const chosen = summaries.find((s) => s.id === databaseId);
  if (chosen && /MONGO|DATASTORE/i.test(String(chosen.type || chosen.edition || ''))) {
    throw new Error(
      `Database "${databaseId}" is not Firestore Native (type=${chosen.type}). Create a Native-mode (default) database in the same project.`
    );
  }

  db = initializeFirestore(admin.app(), { preferRest: true }, databaseId);
  db.settings({ ignoreUndefinedProperties: true });
  console.log(`✅ Firestore connected (database: ${databaseId}, preferRest)`);

  try {
    await db.collection('ops_adminUsersByEmail').doc('_ping').get();
  } catch (err) {
    throw new Error(
      `Firestore ping failed for database "${databaseId}": ${err.message || err.code}. Databases in project: ${JSON.stringify(summaries)}`
    );
  }
}

export default admin;
