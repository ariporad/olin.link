import {
	createTestAccount as createNodemailerTestAccount,
	createTransport,
	getTestMessageUrl,
} from 'nodemailer';

export type Mailer = {
	sendMail(to: string, subject: string, text: string, html?: string): Promise<void>;
	isTestAccount?: boolean;
};

export type SMTPAccount = {
	host: string;
	port: number;
	user: string;
	pass: string;
};

async function createTestAccount(): Promise<SMTPAccount> {
	const testAccount = await createNodemailerTestAccount();

	console.log(`Test email account created (${testAccount.user}), view: ${testAccount.web}`);

	return {
		host: testAccount.smtp.host,
		port: testAccount.smtp.port,
		user: testAccount.user,
		pass: testAccount.pass,
	};
}

let defaultMailer: Mailer | null = null;

export default async function getDefaultMailer(): Promise<Mailer> {
	if (!defaultMailer) defaultMailer = await createMailer();
	return defaultMailer;
}

export async function createMailer(account?: SMTPAccount): Promise<Mailer> {
	// This is dumb, but TypeScript somehow can't figure out that `account` would never be undefined
	// inside `sendMail`.
	let smtpAccount: SMTPAccount;
	let isTestAccount = false;

	if (!account) {
		isTestAccount = true;
		smtpAccount = await createTestAccount();
	} else {
		smtpAccount = account;
	}

	// create reusable transporter object using the default SMTP transport
	let transporter = createTransport({
		host: smtpAccount.host,
		port: smtpAccount.port,
		auth: {
			user: smtpAccount.user,
			pass: smtpAccount.pass,
		},
	});

	return {
		get isTestAccount(): boolean {
			return isTestAccount;
		},

		async sendMail(to: string, subject: string, text: string, html?: string): Promise<void> {
			let info = await transporter.sendMail({
				from: `"Olin.link" <${smtpAccount.user}>`,
				to,
				subject,
				text,
				html,
			});

			console.log('Sent Email:', info);
			if (isTestAccount) console.log('View Email:', getTestMessageUrl(info));
		},
	};
}
