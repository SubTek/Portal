const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {

  const hashedAdmin = bcrypt.hashSync('Admin123!', 10);

  const hashedUser = bcrypt.hashSync('User123!', 10);

  await prisma.user.upsert({

    where: { email: 'admin@demo.com' },

    update: {},

    create: { email: 'admin@demo.com', password: hashedAdmin, role: 'admin', referralCode: 'adminref' }

  });

  await prisma.user.upsert({

    where: { email: 'user@demo.com' },

    update: {},

    create: { email: 'user@demo.com', password: hashedUser, role: 'user', referralCode: 'userref' }

  });

  // Sample prices

  await prisma.price.createMany({

    data: [

      { type: 'subscription', name: '24 hours', amount: 1 },

      { type: 'subscription', name: '48 hours', amount: 2 },

      { type: 'subscription', name: '1 month', amount: 10 },

      { type: 'subscription', name: '3 months', amount: 25 },

      { type: 'subscription', name: '6 months', amount: 45 },

      { type: 'subscription', name: '12 months', amount: 80 },

      { type: 'add-on', name: 'adult content', amount: 5 },

      { type: 'add-on', name: 'backup service', amount: 10 },

      { type: 'add-on', name: 'premium player', amount: 5 },

      { type: 'add-on', name: 'VOD', amount: 10 },

      { type: 'add-on', name: 'custom service', amount: 5 },

    ],

    skipDuplicates: true,

  });

  // Sample custom services

  await prisma.customService.createMany({

    data: [

      { name: 'Premium Channels', description: 'Extra premium channels' },

      { name: 'Extra Streams', description: 'Additional concurrent streams' },

    ],

    skipDuplicates: true,

  });

  // Sample footer

  await prisma.footer.upsert({

    where: { id: 1 },

    update: {},

    create: { content: '<p>© 2025 IPTV Portal | <a href="/contact">Contact Us</a></p>' }

  });

  // Sample page titles

  await prisma.pageTitle.createMany({

    data: [

      { page: 'dashboard', title: 'User Dashboard' },

      { page: 'admin/analytics', title: 'Admin Analytics' },

    ],

    skipDuplicates: true,

  });

  // Sample email templates

  const accountMjml = `<mjml><mj-head><mj-style>.header { background-color: {primary_color}; } .footer { background-color: {secondary_color}; }</mj-style></mj-head><mj-body><mj-section class="header"><mj-column><mj-image src="{logo_url}" alt="Logo" width="150px" /><mj-text color="#ffffff" font-size="20px">Welcome, {username}!</mj-text></mj-column></mj-section><mj-section><mj-column><mj-text>Your Account Details:</mj-text><mj-text>XC Username: {xc_username}</mj-text><mj-text>XC Password: {xc_password}</mj-text><mj-text>Server URL: {server_url}</mj-text><mj-text>VOD Enabled: {vod_enabled}</mj-text><mj-text>Custom Services: {custom_services}</mj-text><mj-text>Referral Code: {referral_code}</mj-text><mj-text>Subscription Expires: {expiration_date}</mj-text></mj-column></mj-section><mj-section class="footer"><mj-column><mj-text color="#ffffff">© {year} IPTV Portal</mj-text></mj-column></mj-section></mj-body></mjml>`;

  const expiryMjml = `<mjml><mj-head><mj-style>.header { background-color: {primary_color}; } .footer { background-color: {secondary_color}; }</mj-style></mj-head><mj-body><mj-section class="header"><mj-column><mj-image src="{logo_url}" alt="Logo" width="150px" /><mj-text color="#ffffff" font-size="20px">Subscription Reminder</mj-text></mj-column></mj-section><mj-section><mj-column><mj-text>Hi {username},</mj-text><mj-text>Your subscription expires on {expiration_date} ({days_remaining} days left).</mj-text><mj-text>Please renew to continue enjoying our services!</mj-text></mj-column></mj-section><mj-section class="footer"><mj-column><mj-text color="#ffffff">© {year} IPTV Portal</mj-text></mj-column></mj-section></mj-body></mjml>`;

  await prisma.emailTemplate.createMany({

    data: [

      { name: 'account_details', content: accountMjml, version: 1 },

      { name: 'subscription_expiry', content: expiryMjml, version: 1 },

      { name: 'ticket_reply', content: '<mjml><!-- custom --></mjml>', version: 1 },

      { name: 'service_announcement', content: '<mjml><!-- custom --></mjml>', version: 1 },

    ],

    skipDuplicates: true,

  });

  // Sample tutorial

  await prisma.tutorial.create({

    data: { title: 'App Setup', content: JSON.stringify([{step: 'Download app'}, {step: 'Enter credentials'}]), forRole: 'user' }

  });

  // Sample trial for conversion tracking

  await prisma.user.create({ data: { email: 'trial@demo.com', password: hashedUser, role: 'user', trialStatus: true, referralCode: 'trialref' } });

  await prisma.user.create({ data: { email: 'converted@demo.com', password: hashedUser, role: 'user', trialStatus: false, paymentStatus: 'paid', referralCode: 'convref' } });

}

main()

  .catch(e => console.error(e))

  .finally(async () => await prisma.$disconnect());
