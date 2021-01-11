import { Router } from 'express';
import { stringify } from 'querystring';
import { isValidURL } from '../helpers';
import getDefaultMailer from '../mail';
import Model, { Shortlink } from '../model';

export default async function createFrontendRouter(model: Model): Promise<Router> {
	const router = Router();
	const mailer = await getDefaultMailer();

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

	router.post('/_/form-create', async (req, res) => {
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

		let shortlink: Shortlink;

		try {
			shortlink = await model.createShortlink(email, url, id);
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
				return;
			} else {
				console.log('ERROR: Failed to create shortlink!', err);
				res.status(500);
				res.redirect(
					'/?' +
						stringify({
							flash: 'Sorry! Failed to Create Shortlink! Unknown Internal Error!',
							flashtype: 'danger',
						}),
				);
				return;
			}
		}

		try {
			await mailer.sendTemplate(
				email,
				`You've created Olin.link/${shortlink.id}!`,
				'shortlink-created.njk',
				{ shortlink },
			);
		} catch (err) {
			console.log(
				'ERROR: Failed to send shortlink creation email! Rolling back shortlink creation',
				err,
			);
			// If we couldn't send the email, then un-create the shortlink. This could also be
			// implemented by using a SQL transaction and waiting to commit/rollback it until the
			// email was sent, but I think that's semantically messier and might have issues with
			// holding a lock on the table for too long.
			// We do not handle the case where this fails, because that almost certainly means we've
			// disconnected from the DB, which is an unrecoverable error.
			await model.deleteShortlink(shortlink.id);
			res.redirect(
				'/?' +
					stringify({
						flash: 'Sorry! Failed to Create Shortlink! Unknown Internal Error!',
						flashtype: 'danger',
					}),
			);
		}
		res.redirect(`/${shortlink.id}/success`);
	});

	return router;
}
