import { Router } from 'express';
import { redirectWithFlash } from '../helpers';
import ShortlinkController, { Shortlink } from '../shortlinkController';

export default async function createFrontendRouter(): Promise<Router> {
	const router = Router();
	const shortlinkController = await ShortlinkController.getDefault();

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

		let validationFails = [
			shortlinkController.validate.url(url) || 'URL',
			shortlinkController.validate.email(email) || 'Email',
			(!!id && shortlinkController.validate.id(id)) || 'Shortlink',
		].filter((x) => typeof x === 'string');

		if (validationFails.length > 0) {
			redirectWithFlash(res, '/', 400, 'danger', `Invalid ${validationFails.join(', ')}!`);
			return;
		}

		let shortlink: Shortlink;

		try {
			shortlink = await shortlinkController.create(email, url, id);
		} catch (err) {
			if (err.code === 'EIDINUSE') {
				redirectWithFlash(
					res,
					'/',
					400,
					'danger',
					`Sorry! That shortlink is already in use!`,
				);
				return;
			} else {
				console.log('ERROR: Failed to create shortlink!', err);
				redirectWithFlash(
					res,
					'/',
					500,
					'danger',
					'Sorry! Failed to Create Shortlink! Unknown Internal Error!',
				);
				return;
			}
		}

		res.redirect(`/${shortlink.id}/success`);
	});

	return router;
}
