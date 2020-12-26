import { Router } from 'express';
import { stringify } from 'querystring';
import Model, { Shortlink } from '../model';
import { toString as generateQRCodeString, toFileStream as generateQRCodeStream } from 'qrcode';

export default function createShortlinkRouter(model: Model): Router {
	const router = Router();

	router.get('/:shortlink/success', async (req, res) => {
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

	router.get('/:shortlink/qrcode.svg', async (req, res) => {
		const svg = await generateQRCodeString(`https://olin.link/${req.params.shortlink}`, {
			type: 'svg',
		});
		res.header('Content-Type', 'image/svg+xml');
		res.write(svg);
		res.end();
	});

	router.get('/:shortlink/qrcode.png', async (req, res) => {
		res.header('Content-Type', 'image/png');
		generateQRCodeStream(res, `https://olin.link/${req.params.shortlink}`);
	});

	router.get('/:shortlink', async (req, res, next) => {
		const id = req.params.shortlink;

		const shortlink = await model.getByIdAndRecordHit(id);

		if (!shortlink) {
			res.status(404);
			res.render('./views/404.html', { id });
			return;
		}

		res.redirect(shortlink.url);
	});

	return router;
}
