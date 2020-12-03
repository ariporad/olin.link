import 'dotenv/config';
import express from 'express';
import { resolve } from 'path';
import bodyParser from 'body-parser';
import Model from './model';
import { isValidURL } from './helpers';
import { encode } from 'punycode';

const app = express();
const model = new Model();

app.use(express.static(resolve(__dirname, '..', 'static')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

app.post('/api/form-create', async (req, res) => {
	let { url, email, id } = req.body;

	if (typeof url !== 'string' || !isValidURL(url, ['http:', 'https:', 'mailto:'])) {
		res.redirect(`/?fail=true&message=${encodeURIComponent('Invalid URL')}`);
		return;
	} else if (
		typeof email !== 'string' ||
		!/^[A-Za-z0-9\.]+@(students\.|alumni\.|faculty\.|staff\.|)olin\.edu$/u.test(email)
	) {
		res.redirect(`/?fail=true&message=${encodeURIComponent('Invalid Olin Email')}`);
		return;
	} else if (
		id &&
		(typeof id !== 'string' || !(id === '' || /^[a-zA-Z0-9_\-\.]{5,20}$/u.test(id)))
	) {
		res.redirect(
			`/?fail=true&message=${encodeURIComponent(
				'Invalid Shortlink! Must be 5-20 characters using only letters, numbers, ., _, and -.',
			)}`,
		);
		return;
	}

	if (!id) id = await model.generateRandomID();

	const shortlink = await model.createShortlink(email, url, id);

	res.redirect(`/success?id=${encodeURIComponent(shortlink.id)}&url=${encodeURIComponent(url)}`);
});

app.get('/:shortlink', async (req, res, next) => {
	const shortlink = await model.getByIdAndRecordHit(req.params.shortlink);
	if (!shortlink) return next();
	res.redirect(shortlink.longURL);
});

app.listen(process.env.PORT || 8080);
