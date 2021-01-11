import { Router } from 'express';
import { stringify } from 'querystring';
import { redirectWithFlash } from '../helpers';
import ShortlinkController from '../shortlinkController';

export default async function createAdminRouter(): Promise<Router> {
	const router = Router();
	const shortlinkController = await ShortlinkController.getDefault();

	router.get('/_/admin', async (req, res) => {
		res.render('./views/admin/index.html', {
			hasFlash: false,
			flash: req.query.flash || '',
			flashType: req.query.flashtype || 'info', // NOTE: query param is all lowercase
			shortlinks: await shortlinkController.list(),
		});
	});

	router.post('/_/admin/update', async (req, res) => {
		const { oldid: oldId, newid: newId, url, email } = req.body;

		let validationFails = [
			shortlinkController.validate.url(url) || 'URL',
			shortlinkController.validate.email(email) || 'Email',
			shortlinkController.validate.id(oldId) || 'Old ID',
			shortlinkController.validate.id(newId) || 'New ID',
		].filter((x) => typeof x === 'string');

		if (validationFails.length > 0) {
			redirectWithFlash(
				res,
				'/_/admin',
				400,
				'danger',
				`Invalid ${validationFails.join(', ')}!`,
			);
			return;
		}

		const shortlink = await shortlinkController.update(oldId, newId, url, email);

		if (!shortlink) {
			return redirectWithFlash(res, '/_/admin', 404, 'danger', 'Unknown Shortlink!');
		}

		res.redirect(`/_/admin#shortlink-${newId}`);
	});

	return router;
}
