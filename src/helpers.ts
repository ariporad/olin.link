import { promisify } from 'util';
import { randomBytes as randomBytesCallback } from 'crypto';
import { URL } from 'url';

// https://stackoverflow.com/a/55585593
export function isValidURL(maybeURL: string, allowedProtocols?: string[]): boolean {
	console.log(maybeURL);
	try {
		const url = new URL(maybeURL);
		console.log(url.protocol, allowedProtocols);
		if (allowedProtocols) {
			return !!allowedProtocols.find(
				(protocol) => url.protocol.toLowerCase() === protocol.toLowerCase(),
			);
		}
		return true;
	} catch (err) {
		return false;
	}
}

const randomBytes = promisify(randomBytesCallback);

const LETTERS = 'bcdfghjklmnopqrstvwxyz1234567890'; // Note that this is 32 chars long, or 5 bits

export const randomString = async (length: number) => {
	const data = await randomBytes(length);

	let result = '';

	for (let i = 0; i < data.length; i++) {
		const idx = data.readUIntLE(i, 1) >> 3;

		result += LETTERS[idx];
	}

	return result;
};
