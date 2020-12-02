import 'dotenv/config';
import express from 'express';
import { resolve } from 'path';

const app = express();

app.use(express.static(resolve(__dirname, '..', 'static')));

app.listen(process.env.PORT || 8080);
