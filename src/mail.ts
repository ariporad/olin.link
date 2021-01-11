import { resolve } from 'path';
import {
	createTestAccount as createNodemailerTestAccount,
	createTransport,
	getTestMessageUrl,
} from 'nodemailer';
import { Environment, FileSystemLoader } from 'nunjucks';

export type Mailer = {
	sendMail(to: string, subject: string, text: string, html?: string): Promise<void>;
	sendTemplate(to: string, subject: string, name: string, context?: object): Promise<void>;
	isTestAccount?: boolean;
};

export type SMTPAccount = {
	host: string;
	port: number;
	user: string;
	pass: string;
	isTestAccount?: boolean;
};

async function createTestAccount(): Promise<SMTPAccount> {
	const testAccount = await createNodemailerTestAccount();

	console.log(`Test email account created (${testAccount.user}), view: ${testAccount.web}`);

	return {
		host: testAccount.smtp.host,
		port: testAccount.smtp.port,
		user: testAccount.user,
		pass: testAccount.pass,
		isTestAccount: true,
	};
}

let defaultMailer: Mailer | null = null;

export default async function getDefaultMailer(): Promise<Mailer> {
	if (!defaultMailer) {
		let account: SMTPAccount;

		if (process.env.SMTP_USE_TEST_ACCOUNT === 'false') {
			const host = process.env.SMTP_HOST;
			const port = parseInt(process.env.SMTP_PORT || 'error!', 10);
			const user = process.env.SMTP_USER;
			const pass = process.env.SMTP_PASS;

			if (host && port && user && pass) {
				account = { host, port, user, pass, isTestAccount: false };
			} else {
				throw new Error(
					'WARNING: $SMTP_USE_TEST_ACCOUNT === "true" but SMTP credentials aren\'t properly set!',
				);
			}
		} else {
			account = await createTestAccount();
		}

		defaultMailer = await createMailer(account);
	}

	return defaultMailer;
}

export async function createMailer(account: SMTPAccount): Promise<Mailer> {
	// create reusable transporter object using the default SMTP transport
	let transporter = createTransport({
		host: account.host,
		port: account.port,
		auth: {
			user: account.user,
			pass: account.pass,
		},
	});

	const nunjucks = new Environment(new FileSystemLoader(resolve(__dirname, '..', 'emails')), {
		noCache: process.env.NODE_ENV === 'development',
	});

	return {
		get isTestAccount(): boolean {
			return account.isTestAccount === true;
		},

		async sendTemplate(
			to: string,
			subject: string,
			name: string,
			context?: object,
		): Promise<void> {
			const text = nunjucks.render(name, context);
			return await this.sendMail(to, subject, text);
		},

		async sendMail(to: string, subject: string, text: string, html?: string): Promise<void> {
			let info = await transporter.sendMail({
				from: `"Olin.link" <${account.user}>`,
				to,
				subject,
				text,
				html,
			});

			console.log('Sent Email!');
			if (account.isTestAccount) console.log('View Email:', getTestMessageUrl(info));
		},
	} as Mailer;
}
