import { Client, QueryResult, QueryResultRow } from 'pg';
import { randomString } from './helpers';

type ArrayQueryResult<R extends QueryResultRow = any> = QueryResult<R> & Array<R>;

export interface Shortlink {
	url: string;
	id: string;
	email: string;
	hit_count: number;
	created_at: Date;
}

export class ModelError extends Error {
	readonly code: string;

	constructor(message: string, code: string) {
		super(message);
		this.code = code;
	}
}

export default class Model {
	private client = new Client();

	private isConnected = false;

	public get connected(): boolean {
		return this.isConnected;
	}

	public async connect() {
		if (this.connected) throw new Error('Already connected!');
		await this.client.connect();
		this.isConnected = true;
	}

	private async query<R extends QueryResultRow>(
		strings: TemplateStringsArray,
		...embeds: (string | number)[]
	): Promise<ArrayQueryResult<R>> {
		if (!this.isConnected) throw new Error("Can't query if not connected!");

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
					throw new ModelError(`Shortlink ID "${id}" is already in use!`, 'EIDINUSE');
				}
			}

			throw new ModelError(`Unknown Database Error: ${err.message}`, 'EDBERROR');
		}
	}

	public async getById(id: string): Promise<Shortlink | undefined> {
		const [shortlink] = await this.query<Shortlink>`
			SELECT *
			FROM shortlinks
			WHERE id = ${id}
			LIMIT 1;
		`;

		return shortlink;
	}

	public async getByIdAndRecordHit(id: string): Promise<Shortlink | undefined> {
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
}
