import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { initSocket } from './socket';
import { startOverdueJob } from './jobs/overdueJob';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import clientRoutes from './routes/clients';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import notificationRoutes from './routes/notifications';
import activityRoutes from './routes/activity';
import dashboardRoutes from './routes/dashboard';

const app = express();
const httpServer = http.createServer(app);

// ─── Global Middleware ────────────────────────────────────────────────────────
const allowedOrigins = [
  env.CLIENT_URL,
  'https://velozity-dashboard-kohl.vercel.app',
  'http://localhost:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Render health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Velozity API is running' });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Socket.io ───────────────────────────────────────────────────────────────
initSocket(httpServer);

// ─── Background Jobs ──────────────────────────────────────────────────────────
startOverdueJob();

// ─── Start Server ─────────────────────────────────────────────────────────────
httpServer.listen(env.PORT, () => {
  console.log(`🚀 Velozity API running on port ${env.PORT} [${env.NODE_ENV}]`);
});

export { app, httpServer };
