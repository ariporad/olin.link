import express from 'express';
import { resolve } from 'path';
import bodyParser from 'body-parser';
import nunjucks from 'nunjucks';
import Model from './model';
import createFrontendRouter from './routers/frontend';
import createShortlinkRouter from './routers/shortlink';
import createAdminRouter from './routers/admin';

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

	app.use(await createFrontendRouter(model));
	app.use(await createShortlinkRouter(model));
	app.use(await createAdminRouter(model));

	return app;
}
