import { resolve } from 'path';
import {
	createTestAccount as createNodemailerTestAccount,
	createTransport,
	getTestMessageUrl,
} from 'nodemailer';
import { Environment, FileSystemLoader } from 'nunjucks';
import Mail from 'nodemailer/lib/mailer';

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

export default class Mailer {
	private static default: Mailer;

	public static async getDefault(): Promise<Mailer> {
		if (!this.default) {
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

			this.default = new this(account);
		}

		return this.default;
	}

	private readonly account: SMTPAccount;
	private readonly transport: Mail;
	private readonly nunjucks: Environment = new Environment(
		new FileSystemLoader(resolve(__dirname, '..', 'emails')),
		{
			noCache: process.env.NODE_ENV === 'development',
		},
	);

	public get isTestAccount(): boolean {
		return this.account.isTestAccount === true;
	}

	public constructor(account: SMTPAccount) {
		this.account = account;
		this.transport = createTransport({
			host: account.host,
			port: account.port,
			auth: {
				user: account.user,
				pass: account.pass,
			},
		});
	}

	async sendTemplate(to: string, subject: string, name: string, context?: object): Promise<void> {
		const text = this.nunjucks.render(name, context);
		return await this.sendMail(to, subject, text);
	}

	async sendMail(to: string, subject: string, text: string, html?: string): Promise<void> {
		let info = await this.transport.sendMail({
			from: `"Olin.link" <${this.account.user}>`,
			to,
			subject,
			text,
			html,
		});

		console.log('Sent Email!');
		if (this.account.isTestAccount) console.log('View Email:', getTestMessageUrl(info));
	}
}
