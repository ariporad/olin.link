import 'dotenv/config';
import express from 'express';

const app = express();

app.get('/', (req, res) => {
	res.status(200);
	res.write('Hello World!');
	res.end();
});

app.listen(process.env.PORT || 8080);
