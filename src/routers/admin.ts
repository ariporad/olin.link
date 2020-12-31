import { Router } from 'express';
import { stringify } from 'querystring';
import Model from '../model';

export default function createAdminRouter(model: Model): Router {
	const router = Router();

	router.get('/_/admin', async (req, res) => {
		res.render('./views/admin/index.html', {
			hasFlash: false,
			flash: req.query.flash || '',
			flashType: req.query.flashtype || 'info', // NOTE: query param is all lowercase
			shortlinks: await model.listShortlinks(0, 100000),
		});
	});

	router.post('/_/admin/update', async (req, res) => {
		const { oldid, newid, url, email } = req.body;

		const shortlink = await model.updateShortlink(oldid, newid, url, email);

		if (!shortlink) {
			res.status(404);
			res.redirect(
				'/?' +
					stringify({
						flash: 'Unknown Shortlink!',
						flashtype: 'danger',
					}),
			);
			return;
		}

		res.redirect(`/_/admin#shortlink-${newid}`);
	});

	return router;
}
