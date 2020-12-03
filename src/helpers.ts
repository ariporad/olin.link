import { url } from 'inspector';
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
