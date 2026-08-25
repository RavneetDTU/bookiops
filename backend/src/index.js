import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { connectFirestore } from './config/firebase.js';
import { seedDefaults } from './db/seed.js';
import authRoutes from './routes/auth.js';
import onboardingRoutes from './routes/onboarding.js';
import restaurantRoutes from './routes/restaurants.js';
import numberChangeRoutes from './routes/numberChanges.js';

const app = express();

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'bookiops' }));

app.use('/auth', authRoutes);
app.use(onboardingRoutes);
app.use(restaurantRoutes);
app.use(numberChangeRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

async function start() {
  await connectFirestore();
  await seedDefaults();
  app.listen(config.port, () => {
    console.log(`BookiOps API listening on ${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start BookiOps:', err);
  process.exit(1);
});
