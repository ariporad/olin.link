import { Router } from 'express';
import { toString as generateQRCodeString, toFileStream as generateQRCodeStream } from 'qrcode';
import { redirectWithFlash } from '../helpers';
import ShortlinkController, { Shortlink } from '../shortlinkController';

export default async function createShortlinkRouter(): Promise<Router> {
	const router = Router();
	const shortlinkController = await ShortlinkController.getDefault();

	router.get('/:shortlink/success', async (req, res) => {
		const id = req.params.shortlink;

		let shortlink: Shortlink | undefined;

		if (
			!shortlinkController.validate.id(id) ||
			!(shortlink = await shortlinkController.getById(id))
		) {
			return redirectWithFlash(res, '/', 404, 'warn', 'Unknown Shortlink!');
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

		const shortlink = await shortlinkController.getByIdAndRecordHit(id);

		if (!shortlink) {
			res.status(404);
			res.render('./views/404.html', { id });
			return;
		}

		res.redirect(shortlink.url);
	});

	return router;
}
