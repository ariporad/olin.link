import { Client, QueryResult, QueryResultRow } from 'pg';
import { InternalError, randomString } from './helpers';

type ArrayQueryResult<R extends QueryResultRow = any> = QueryResult<R> & Array<R>;

export interface Shortlink {
	url: string;
	id: string;
	email: string;
	hit_count: number;
	created_at: Date;
}

export default class Database {
	private static default: Database;

	public static async getDefault(): Promise<Database> {
		if (!this.default) {
			this.default = new Database();
			await this.default.connect();
		}

		return this.default;
	}

	private client = new Client();

	private isConnected = false;

	public get connected(): boolean {
		return this.isConnected;
	}

	public async connect() {
		if (this.connected) throw new InternalError('Already connected!', 'EDBALREADYCONNECTED');
		await this.client.connect();
		this.isConnected = true;
	}

	private async query<R extends QueryResultRow>(
		strings: TemplateStringsArray,
		...embeds: (string | number)[]
	): Promise<ArrayQueryResult<R>> {
		if (!this.isConnected) throw new InternalError("Can't query if not connected!", 'ENOCONN');

		let queryString = '';

		for (let i = 0; i < embeds.length; i++) {
			queryString += strings[i] + `$${i + 1}`;
		}

		queryString += strings[strings.length - 1];

		const queryResult = await this.client.query(queryString, embeds);

		return Object.assign(queryResult.rows, queryResult);
	}

	async createShortlink(user: string, url: string, id?: string): Promise<Shortlink> {
		// FIXME: This leads to a race condition where it's possible (but very unlikely) that the
		//        random ID is used between when it's generated/checked and when it's inserted.
		//        We should do the loop if the insert fails instead.

		let randomID = false;

		if (!id) {
			id = await randomString(6);
			randomID = true;
		}

		try {
			const [shortlink] = await this.query<Shortlink>`
				INSERT INTO shortlinks (id, url, email)
				VALUES (${id}, ${url}, ${user})
				RETURNING *;
			`;

			return shortlink;
		} catch (err) {
			// If this ID is already taken
			if (err.code === '23505' && err.constraint === 'shortlinks_pkey') {
				if (randomID) {
					// If the ID was random to begin with, just try again (which will generate a new
					// id in the process)
					// FIXME: If we ever ran out of randomly generated IDs, this would recurse forever
					return await this.createShortlink(user, url);
				} else {
					throw new InternalError(`Shortlink ID "${id}" is already in use!`, 'EIDINUSE');
				}
			}

			throw new InternalError(`Unknown Database Error: ${err.message}`, 'EDBERROR', err);
		}
	}

	public async getShortlinkById(id: string): Promise<Shortlink | undefined> {
		const [shortlink] = await this.query<Shortlink>`
			SELECT *
			FROM shortlinks
			WHERE id = ${id}
			LIMIT 1;
		`;

		return shortlink;
	}

	public async getShortlinkByIdAndRecordHit(id: string): Promise<Shortlink | undefined> {
		const [shortlink] = await this.query<Shortlink>`
			UPDATE shortlinks
			SET hit_count = hit_count + 1
			WHERE id = ${id}
			RETURNING *;
		`;

		return shortlink;
	}

	public async listShortlinks(start: number, count: number): Promise<Shortlink[]> {
		return await this.query<Shortlink>`
			SELECT *
			FROM shortlinks
			ORDER BY created_at ASC
			OFFSET ${start} ROWS
			FETCH NEXT ${count} ROWS ONLY;
		`;
	}

	public async updateShortlink(
		oldID: string,
		newID: string,
		url: string,
		email: string,
	): Promise<Shortlink | null> {
		const shortlinks = await this.query<Shortlink>`
			UPDATE shortlinks
			SET id = ${newID}, url = ${url}, email = ${email}
			WHERE id = ${oldID}
			RETURNING *;
		`;

		return shortlinks[0] || null;
	}

	public async deleteShortlink(id: string): Promise<boolean> {
		const deletedShortlinks = await this.query<Shortlink>`
			DELETE FROM shortlinks
			WHERE id = ${id}
			RETURNING *;
		`;

		return deletedShortlinks.length > 0;
	}
}
