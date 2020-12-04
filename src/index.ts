import 'dotenv/config';
import express from 'express';
import { resolve } from 'path';
import bodyParser from 'body-parser';
import nunjucks from 'nunjucks';
import Model from './model';
import { isValidURL } from './helpers';
import { stringify } from 'querystring';
import { toString as generateQRCode } from 'qrcode';

const app = express();
const model = new Model();

app.set('views', resolve(__dirname, '..', 'views'));

nunjucks.configure({
	express: app,
	noCache: process.env.NODE_ENV === 'development',
});

app.use(express.static(resolve(__dirname, '..', 'static')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

app.get('/', (req, res) => {
	const locals: any = {
		hasFlash: false,
		url: req.query.url || req.query.longlink || '',
		id: req.query.id || req.query.shortlink || '',
		email: req.query.email || '',
		flash: req.query.flash || '',
		flashType: req.query.flashtype || 'info', // NOTE: query param is all lowercase
	};

	res.render('./views/index.html', locals);
});

app.post('/api/form-create', async (req, res) => {
	let { url, email, id } = req.body;

	if (typeof url !== 'string' || !isValidURL(url, ['http:', 'https:', 'mailto:'])) {
		res.redirect(
			'/?' +
				stringify({
					flash: 'Invalid URL',
					flashtype: 'danger',
				}),
		);
		return;
	} else if (
		typeof email !== 'string' ||
		!/^[A-Za-z0-9\.]+@(students\.|alumni\.|faculty\.|staff\.|)olin\.edu$/u.test(email)
	) {
		res.redirect(
			'/?' +
				stringify({
					flash: 'Invalid Email',
					flashtype: 'danger',
				}),
		);
		return;
	} else if (
		id &&
		(typeof id !== 'string' || !(id === '' || /^[a-zA-Z0-9_\-\.]{5,20}$/u.test(id)))
	) {
		res.redirect(
			'/?' +
				stringify({
					flash:
						'Invalid Shortlink! Must be 5-20 characters using only letters, numbers, ., _, and -.',
					flashtype: 'danger',
				}),
		);
		return;
	}

	if (!id) id = await model.generateRandomID();

	const shortlink = await model.createShortlink(email, url, id);

	res.redirect(`/${id}/success`);
});

app.get('/:shortlink/success', async (req, res) => {
	const id = req.params.shortlink;

	if (!id || typeof id !== 'string') {
		res.redirect(
			'/?' + stringify({ flash: 'Internal Error! Unknown Shortlink!', flashtype: 'danger' }),
		);
		return;
	}

	const shortlink = await model.getById(id);

	if (shortlink === undefined) {
		res.redirect(
			'/?' + stringify({ flash: 'Internal Error! Unknown Shortlink!', flashtype: 'danger' }),
		);
		return;
	}

	res.render('./views/success.html', {
		id: shortlink.id,
		url: shortlink.longURL,
	});
});

app.get('/:shortlink/qrcode', async (req, res) => {
	const svg = await generateQRCode(`https://olin.link/${req.params.shortlink}`, { type: 'svg' });
	res.header('Content-Type', 'image/svg+xml');
	res.write(svg);
	res.end();
});

app.get('/:shortlink', async (req, res, next) => {
	const shortlink = await model.getByIdAndRecordHit(req.params.shortlink);
	if (!shortlink) return next();
	res.redirect(shortlink.longURL);
});

app.listen(process.env.PORT || 8080);
