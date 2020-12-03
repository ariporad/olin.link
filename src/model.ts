export interface Shortlink {
	longURL: string;
	id: string;
	user: string;
	hitCount: number;
}

export default class Model {
	shortlinks: Shortlink[] = [];

	async createShortlink(user: string, longURL: string, id: string): Promise<Shortlink> {
		const shortlink = {
			id: id.toLowerCase(),
			longURL,
			user,
			hitCount: 0,
		};

		this.shortlinks.push(shortlink);

		return shortlink;
	}

	async getByIdAndRecordHit(id: string): Promise<Shortlink | undefined> {
		const shortlink = await this.getById(id);

		if (shortlink) {
			shortlink.hitCount++;
		}

		return shortlink;
	}

	async getById(id: string): Promise<Shortlink | undefined> {
		id = id.toLowerCase();
		return this.shortlinks.find((s) => s.id === id);
	}

	async hasID(id: string): Promise<boolean> {
		return !!(await this.getById(id));
	}

	async generateRandomID(): Promise<string> {
		return (this.shortlinks.length + 1).toString(36).padStart(6, '0');
	}
}
