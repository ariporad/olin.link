import 'dotenv/config';
import createApp from './app';

(async function (port) {
	try {
		const app = await createApp();

		return new Promise<void>((done) => {
			app.listen(port, done);
		});
	} catch (err) {
		console.error('Fatal Top Level Error!');
		console.error(err);
		process.exit(1);
	}
})(process.env.PORT || 8080);
