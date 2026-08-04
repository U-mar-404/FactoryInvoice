import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import orderRoutes from './routes/orders.js';
import customerRoutes from './routes/customers.js';
import paymentRoutes from './routes/payments.js';
import reportRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import productRoutes from './routes/products.js';
import agentRoutes from './routes/agents.js';
import stockRoutes from './routes/stock.js';
import whatsappRoutes from './routes/whatsapp.js';

const app = express();
const PORT = process.env.PORT || 5001;

const corsOriginEnv = process.env.CORS_ORIGIN;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile native apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      if (!corsOriginEnv || corsOriginEnv === '*' || corsOriginEnv.includes('*')) {
        return callback(null, true);
      }

      const origins = corsOriginEnv.split(',').map((s) => s.trim());
      if (origins.includes(origin) || origins.some((o) => origin.startsWith(o))) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Serve static uploaded files (e.g. product thumbnail images)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`MESCO Backend Server running on http://0.0.0.0:${PORT} (listening on all interfaces)`);
});
