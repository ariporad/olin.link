import { Router } from 'express';
import { stringify } from 'querystring';
import { isValidURL } from '../helpers';
import Model from '../model';

export default function createFrontendRouter(model: Model): Router {
	const router = Router();

	router.get('/', (req, res) => {
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

	router.post('/api/form-create', async (req, res) => {
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

	return router;
}
