import { Router } from 'express';
import { stringify } from 'querystring';
import { InternalError, redirectWithFlash } from '../helpers';
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

	router.get('/_/admin/:shortlink/resend-confirmation', async (req, res) => {
		const id = req.params.shortlink;
		try {
			shortlinkController.resendConfirmationEmail(id);
		} catch (err) {
			if (err.code === 'EBAGARGS') {
				return redirectWithFlash(res, '/_/admin', 400, 'danger', 'Invalid ID!');
			} else if (err.code === 'ENOTFOUND') {
				return redirectWithFlash(res, '/_/admin', 404, 'danger', 'Shortlink Not Found!');
			} else {
				return redirectWithFlash(res, '/_/admin', 500, 'danger', 'Unknown Internal Error!');
			}
		}

		res.redirect(`/_/admin#shortlink-${id}`);
	});

	return router;
}
