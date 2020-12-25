import express from 'express';
import { resolve } from 'path';
import bodyParser from 'body-parser';
import nunjucks from 'nunjucks';
import Model, { Shortlink } from './model';
import { isValidURL } from './helpers';
import { stringify } from 'querystring';
import { toString as generateQRCodeString, toFileStream as generateQRCodeStream } from 'qrcode';

export default async function createApp() {
	const app = express();
	const model = new Model();

	await model.connect();

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
			res.status(400);
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
			res.status(400);
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
			res.status(400);
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

		try {
			const shortlink = await model.createShortlink(email, url, id);
			res.redirect(`/${shortlink.id}/success`);
		} catch (err) {
			if (err.code === 'EIDINUSE') {
				res.status(400);
				res.redirect(
					'/?' +
						stringify({
							flash: 'Sorry! That shortlink is already in use!',
							flashtype: 'danger',
						}),
				);
			} else {
				res.status(500);
				res.redirect(
					'/?' +
						stringify({
							flash: 'Sorry! Unknown Internal Error!',
							flashtype: 'danger',
						}),
				);
			}
		}
	});

	app.get('/:shortlink/success', async (req, res) => {
		const id = req.params.shortlink;

		let shortlink: Shortlink | undefined;

		if (!id || typeof id !== 'string' || !(shortlink = await model.getById(id))) {
			res.status(404);
			res.redirect(
				'/?' +
					stringify({ flash: 'Internal Error! Unknown Shortlink!', flashtype: 'danger' }),
			);
			return;
		}

		res.render('./views/success.html', {
			id: shortlink.id,
			url: shortlink.url,
		});
	});

	app.get('/:shortlink/qrcode.svg', async (req, res) => {
		const svg = await generateQRCodeString(`https://olin.link/${req.params.shortlink}`, {
			type: 'svg',
		});
		res.header('Content-Type', 'image/svg+xml');
		res.write(svg);
		res.end();
	});

	app.get('/:shortlink/qrcode.png', async (req, res) => {
		res.header('Content-Type', 'image/png');
		generateQRCodeStream(res, `https://olin.link/${req.params.shortlink}`);
	});

	app.get('/:shortlink', async (req, res, next) => {
		const id = req.params.shortlink;

		const shortlink = await model.getByIdAndRecordHit(id);

		if (!shortlink) {
			res.status(404);
			res.render('./views/404.html', { id });
			return;
		}

		res.redirect(shortlink.url);
	});

	return app;
}
