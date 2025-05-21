  //"type": "commonjs" caso de BO no jSON

import express from 'express';
import cors from 'cors';
import authRouter from './routes/authRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/auth', authRouter);

app.listen(process.env.PORT, () => {
    console.log('Server is running on port 3000');
});
