import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import { corsMiddleware } from './middleware/cors';
import authRouter from './routes/auth';
import playerRouter from './routes/player';
import uploadRouter from './routes/upload';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'adwabingo-api' }));
app.use('/api/auth', authRouter);
app.use('/api/player', playerRouter);
app.use('/api/upload', uploadRouter);

app.listen(PORT, () => console.log(`🚀 API running on port ${PORT}`));
