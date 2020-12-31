import { Router } from 'express';
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
		res.write('TODO');
		res.end();
	});

	return router;
}
