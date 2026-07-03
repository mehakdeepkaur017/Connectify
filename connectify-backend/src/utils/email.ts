import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let transporter: nodemailer.Transporter | null = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  const hasCredentials = process.env.SMTP_USER && process.env.SMTP_USER !== 'ethereal_user';

  if (hasCredentials) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    
    try {
      await transporter.verify();
      return transporter;
    } catch (error) {
      console.warn('⚠️ SMTP Credentials invalid. Falling back to Ethereal test account.');
    }
  }

  // Fallback to auto-generated Ethereal account
  const testAccount = await nodemailer.createTestAccount();
  
  console.log('\n--- Ethereal Test Account Created ---');
  console.log('Username:', testAccount.user);
  console.log('Password:', testAccount.pass);
  console.log('-------------------------------------\n');
  
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return transporter;
};

export const sendEmail = async (options: SendEmailOptions) => {
  try {
    const mailer = await getTransporter();
    
    const mailOptions = {
      from: '"Connectify" <noreply@connectify.com>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await mailer.sendMail(mailOptions);
    
    console.log('\n--- Email Sending Verification ---');
    console.log('Message ID:', info.messageId);
    console.log('Accepted:', info.accepted);
    console.log('Rejected:', info.rejected);
    console.log('Envelope:', info.envelope);
    
    // Log preview URL if it's an ethereal message
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`✉️ Email Preview URL: ${previewUrl}`);
    }
    console.log('----------------------------------\n');
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    // Do not throw to avoid crashing signup/auth flows
  }
};
