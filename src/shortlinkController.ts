import { InternalError, isValidURL, throwError } from './helpers';
import Mailer from './mail';
import Database, { Shortlink } from './database';

export { Shortlink } from './database';

export default class ShortlinkController {
	private static default: ShortlinkController;
	public static async getDefault(): Promise<ShortlinkController> {
		if (!this.default) {
			this.default = new ShortlinkController(
				await Database.getDefault(),
				await Mailer.getDefault(),
			);
		}

		return this.default;
	}

	private readonly db: Database;
	private readonly mailer: Mailer;

	constructor(db: Database, mailer: Mailer) {
		this.db = db;
		this.mailer = mailer;
	}

	public async create(email: string, url: string, id: string): Promise<Shortlink> {
		this.enforceValid.email(email);
		this.enforceValid.url(url);
		this.enforceValid.id(id);

		let shortlink = await this.db.createShortlink(email, url, id);

		try {
			await this.sendConfirmationEmail(shortlink);
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
			await this.db.deleteShortlink(shortlink.id);

			throw new InternalError(
				'Failed to send shortlink confirmation email!',
				'EMAILFAIL',
				err,
			);
		}

		return shortlink;
	}

	public async getById(id: string): Promise<Shortlink | undefined> {
		this.enforceValid.id(id);
		return await this.db.getShortlinkById(id);
	}

	public async getByIdAndRecordHit(id: string): Promise<Shortlink | undefined> {
		this.enforceValid.id(id);
		return await this.db.getShortlinkByIdAndRecordHit(id);
	}

	public async list(start: number = 0, count: number = 999999999999): Promise<Shortlink[]> {
		if (start < 0 || count < 1) throw new InternalError('Invalid start or count!', 'EBADARGS');
		return await this.db.listShortlinks(start, count);
	}

	public async update(
		oldID: string,
		newID: string,
		url: string,
		email: string,
	): Promise<Shortlink | null> {
		this.enforceValid.id(oldID);
		this.enforceValid.id(newID);
		this.enforceValid.url(url);
		this.enforceValid.email(email);

		return await this.db.updateShortlink(oldID, newID, url, email);
	}

	public async resendConfirmationEmail(id: string): Promise<void> {
		this.enforceValid.id(id);

		const shortlink = await this.getById(id);

		if (!shortlink) throw new InternalError('Shortlink Not Found!', 'ENOTFOUND');

		this.sendConfirmationEmail(shortlink);
	}

	private async sendConfirmationEmail(shortlink: Shortlink): Promise<void> {
		await this.mailer.sendTemplate(
			shortlink.email,
			`You've created Olin.link/${shortlink.id}!`,
			'shortlink-created.njk',
			{ shortlink },
		);
	}

	public readonly validate = {
		url: (url: string) =>
			typeof url === 'string' && isValidURL(url, ['http:', 'https:', 'mailto:']),

		email: (email: string) =>
			typeof email === 'string' &&
			/^[A-Za-z0-9\.]+@(students\.|alumni\.|faculty\.|staff\.|)olin\.edu$/u.test(email),

		id: (id: string) => typeof id === 'string' && /^[a-zA-Z0-9_\-\.]{5,20}$/u.test(id),
	};

	// This object has exactly the same type as `validate`, but throws if the validation fails.
	public readonly enforceValid = Object.fromEntries(
		Object.entries(this.validate).map(([key, validator]) => [
			key,
			((...args: any[]) =>
				(validator as any)(...args) ||
				throwError(new InternalError(`Invalid ${key}!`, 'EBADARGS'))) as typeof validator,
		]),
	) as typeof ShortlinkController.prototype.validate;
}
