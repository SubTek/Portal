const fastify = require('fastify')({ logger: true });
const jwt = require('@fastify/jwt');
const rateLimit = require('@fastify/rate-limit');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Mailgun = require('mailgun-js');
const mjml2html = require('mjml');
const prisma = new PrismaClient();
fastify.decorate('prisma', prisma);

fastify.register(jwt, { secret: process.env.JWT_SECRET });
fastify.register(rateLimit);

fastify.addHook('preHandler', (request, reply, done) => {
  if (request.url !== '/login' && request.url !== '/forgot-password' && request.url !== '/reset-password') {
    request.jwtVerify().catch(() => reply.code(401).send({ error: 'Unauthorized' }));
  }
  done();
});

fastify.register(rateLimit, {
  max: 5,
  timeWindow: '1 minute',
  keyGenerator: (request) => request.ip,
  allowList: [],
  hook: 'onRequest',
  routeInfo: { url: '/login' }
});

function renderMjml(template, data) {
  let content = template.content;
  for (const key in data) {
    content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), data[key]);
  }
  return mjml2html(content).html;
}

const mailgun = Mailgun({ apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN });

// Auth

fastify.post('/login', async (request, reply) => {
  const { email, password } = request.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }
  const token = fastify.jwt.sign({ id: user.id, role: user.role });
  return { token };
});

fastify.post('/forgot-password', async (request, reply) => {
  const { email } = request.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { message: 'If email exists, reset link sent' }; // security
  const resetToken = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({ where: { email }, data: { preferences: { ...user.preferences, resetToken } } }); // store in preferences Json
  const link = `${process.env.APP_URL}/reset-password?token=${resetToken}&email=${email}`;
  const html = `<p>Click <a href="${link}">here</a> to reset password.</p>`;
  await mailgun.messages().send({ from: 'no-reply@demo.com', to: email, subject: 'Password Reset', html });
  return { message: 'Reset link sent' };
});

fastify.post('/reset-password', async (request, reply) => {
  const { email, token, newPassword } = request.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.preferences.resetToken !== token) return reply.code(400).send({ error: 'Invalid token' });
  const hashed = bcrypt.hashSync(newPassword, 10);
  await prisma.user.update({ where: { email }, data: { password: hashed, preferences: { ...user.preferences, resetToken: null } } });
  return { message: 'Password reset' };
});

fastify.post('/change-password', async (request, reply) => {
  const { oldPassword, newPassword } = request.body;
  const user = await prisma.user.findUnique({ where: { id: request.user.id } });
  if (!bcrypt.compareSync(oldPassword, user.password)) return reply.code(400).send({ error: 'Invalid old password' });
  const hashed = bcrypt.hashSync(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
  return { message: 'Password changed' };
});

// User dashboard routes

fastify.get('/user/dashboard', async (request) => {
  const user = await prisma.user.findUnique({ where: { id: request.user.id } });
  const daysRemaining = user.subscriptionExpiration ? Math.max(0, Math.ceil((user.subscriptionExpiration - new Date()) / (24 * 60 * 60 * 1000))) : 0;
  const status = await prisma.serviceStatus.findFirst({ orderBy: { updatedAt: 'desc' } });
  return { user, daysRemaining, serviceStatus: status };
});

fastify.get('/user/tickets', async (request) => {
  return await prisma.ticket.findMany({ where: { userId: request.user.id }, include: { replies: true } });
});

fastify.post('/user/tickets', async (request) => {
  const { subject, description } = request.body;
  const ticket = await prisma.ticket.create({ data: { userId: request.user.id, subject, description } });
  await prisma.activityLog.create({ data: { userId: request.user.id, action: 'ticket_submitted', details: { ticketId: ticket.id } } });
  return ticket;
});

fastify.post('/user/tickets/:id/reply', async (request) => {
  const { message } = request.body;
  const replyData = await prisma.reply.create({ data: { ticketId: Number(request.params.id), userId: request.user.id, message } });
  return replyData;
});

fastify.get('/user/notifications', async (request) => {
  return await prisma.notification.findMany({ where: { userId: request.user.id } });
});

fastify.post('/user/notifications/:id/read', async (request) => {
  await prisma.notification.update({ where: { id: Number(request.params.id) }, data: { read: true } });
  return { success: true };
});

fastify.get('/user/activity-logs', async (request) => {
  return await prisma.activityLog.findMany({ where: { userId: request.user.id } });
});

// Admin routes

fastify.get('/admin/users', async (request) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  return await prisma.user.findMany();
});

fastify.post('/admin/users', async (request, reply) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  let data = request.body;
  data.password = bcrypt.hashSync(data.password || 'default123', 10);
  data.referralCode = crypto.randomBytes(8).toString('hex');
  const user = await prisma.user.create({ data });
  await prisma.auditLog.create({ data: { adminId: request.user.id, action: 'user_created', details: { userId: user.id } } });
  // Send account details email
  const template = await prisma.emailTemplate.findFirst({ where: { name: 'account_details' } });
  const branding = await prisma.branding.findFirst() || { primaryColor: '#0000FF', secondaryColor: '#000000', logoUrl: '' };
  const customServicesStr = user.customServices ? user.customServices.map(cs => `${cs.name}: ${cs.enabled}`).join(', ') : '';
  const emailData = {
    username: user.email,
    xc_username: user.xcUsername,
    xc_password: user.xcPassword,
    server_url: user.serverUrl,
    vod_enabled: user.vodEnabled ? 'Yes' : 'No',
    custom_services: customServicesStr,
    referral_code: user.referralCode,
    expiration_date: user.subscriptionExpiration ? user.subscriptionExpiration.toISOString() : '',
    year: new Date().getFullYear(),
    primary_color: branding.primaryColor,
    secondary_color: branding.secondaryColor,
    logo_url: branding.logoUrl,
  };
  const html = renderMjml(template, emailData);
  await mailgun.messages().send({ from: 'no-reply@demo.com', to: user.email, subject: 'Account Details', html });
  return user;
});

fastify.put('/admin/users/:id', async (request, reply) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  const data = request.body;
  if (data.password) data.password = bcrypt.hashSync(data.password, 10);
  const user = await prisma.user.update({ where: { id: Number(request.params.id) }, data });
  await prisma.auditLog.create({ data: { adminId: request.user.id, action: 'user_updated', details: { userId: user.id } } });
  return user;
});

fastify.delete('/admin/users/:id', async (request, reply) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  await prisma.user.delete({ where: { id: Number(request.params.id) } });
  await prisma.auditLog.create({ data: { adminId: request.user.id, action: 'user_deleted', details: { userId: Number(request.params.id) } } });
  return { success: true };
});

fastify.post('/admin/users/bulk', async (request, reply) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  const { action, userIds, data } = request.body;
  if (action === 'delete') {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  } else if (action === 'edit') {
    await prisma.user.updateMany({ where: { id: { in: userIds } }, data });
  } else if (action === 'email') {
    // send bulk emails
    const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
    for (const user of users) {
      // similar to above, send email
    }
  }
  await prisma.auditLog.create({ data: { adminId: request.user.id, action: 'bulk_user_action', details: { action, userIds } } });
  return { success: true };
});

fastify.get('/admin/activity-logs', async (request) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  return await prisma.activityLog.findMany();
});

fastify.get('/admin/audit-logs', async (request) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  return await prisma.auditLog.findMany();
});

fastify.get('/admin/prices', async (request) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  return await prisma.price.findMany();
});

fastify.put('/admin/prices/:id', async (request, reply) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  const price = await prisma.price.update({ where: { id: Number(request.params.id) }, data: request.body });
  await prisma.auditLog.create({ data: { adminId: request.user.id, action: 'price_updated', details: { priceId: price.id } } });
  return price;
});

fastify.post('/admin/prices/bulk', async (request, reply) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  const { type, value, priceIds } = request.body;
  const prices = await prisma.price.findMany({ where: { id: { in: priceIds } } });
  const updated = prices.map(p => ({
    ...p,
    amount: type === 'percent' ? p.amount * (1 + value/100) : value,
  }));
  for (const u of updated) {
    await prisma.price.update({ where: { id: u.id }, data: { amount: u.amount } });
  }
  await prisma.auditLog.create({ data: { adminId: request.user.id, action: 'bulk_price_update', details: { type, value, priceIds } } });
  return updated;
});

fastify.get('/admin/custom-services', async (request) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  return await prisma.customService.findMany();
});

fastify.post('/admin/custom-services', async (request, reply) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  const service = await prisma.customService.create({ data: request.body });
  await prisma.auditLog.create({ data: { adminId: request.user.id, action: 'custom_service_created', details: { serviceId: service.id } } });
  return service;
});

fastify.put('/admin/custom-services/:id', async (request, reply) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  const service = await prisma.customService.update({ where: { id: Number(request.params.id) }, data: request.body });
  await prisma.auditLog.create({ data: { adminId: request.user.id, action: 'custom_service_updated', details: { serviceId: service.id } } });
  return service;
});

fastify.get('/admin/content/news', async (request) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  return await prisma.news.findMany();
});

fastify.post('/admin/content/news', async (request, reply) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  return await prisma.news.create({ data: request.body });
});

 // Similar for FAQ, AppDownload

fastify.get('/admin/email-templates', async (request) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  return await prisma.emailTemplate.findMany();
});

fastify.post('/admin/email-templates', async (request, reply) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  const { name, content } = request.body;
  const latest = await prisma.emailTemplate.findFirst({ where: { name }, orderBy: { version: 'desc' } });
  const version = latest ? latest.version + 1 : 1;
  const template = await prisma.emailTemplate.create({ data: { name, content, version } });
  await prisma.auditLog.create({ data: { adminId: request.user.id, action: 'template_created', details: { templateId: template.id } } });
  return template;
});

fastify.put('/admin/email-templates/:id', async (request, reply) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  const { content } = request.body;
  const old = await prisma.emailTemplate.findUnique({ where: { id: Number(request.params.id) } });
  const template = await prisma.emailTemplate.create({ data: { name: old.name, content, version: old.version + 1 } });
  await prisma.auditLog.create({ data: { adminId: request.user.id, action: 'template_updated', details: { templateId: template.id } } });
  return template;
});

fastify.post('/admin/send-email', async (request, reply) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  const { userId, templateName, data } = request.body;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const template = await prisma.emailTemplate.findFirst({ where: { name: templateName, version: { gte: 0 } }, orderBy: { version: 'desc' } });
  const html = renderMjml(template, data);
  await mailgun.messages().send({ from: 'no-reply@demo.com', to: user.email, subject: 'Notification', html });
  await prisma.auditLog.create({ data: { adminId: request.user.id, action: 'email_sent', details: { userId, templateName } } });
  return { success: true };
});

fastify.get('/admin/analytics', async (request) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  const newUsers = await prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30*24*60*60*1000) } } });
  const activeSubs = await prisma.user.count({ where: { subscriptionExpiration: { gte: new Date() } } });
  const expiredSubs = await prisma.user.count({ where: { subscriptionExpiration: { lt: new Date() } } });
  const revenue = await prisma.transaction.aggregate({ _sum: { amount: true } });
  const trials = await prisma.user.count({ where: { trialStatus: true } });
  const conversions = await prisma.user.count({ where: { trialStatus: true, paymentStatus: 'paid' } });
  const conversionRate = trials > 0 ? (conversions / trials) * 100 : 0;
  // More queries for trends
  return { newUsers, activeSubs, expiredSubs, revenue: revenue._sum.amount || 0, trialConversion: conversionRate };
});

fastify.get('/admin/tickets', async (request) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  return await prisma.ticket.findMany({ include: { replies: true, user: true } });
});

fastify.post('/admin/tickets/:id/reply', async (request, reply) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  const { message } = request.body;
  const replyData = await prisma.reply.create({ data: { ticketId: Number(request.params.id), adminId: request.user.id, message } });
  // Send email notification to user
  const ticket = await prisma.ticket.findUnique({ where: { id: Number(request.params.id) } });
  const template = await prisma.emailTemplate.findFirst({ where: { name: 'ticket_reply' } });
  if (template) {
    const html = renderMjml(template, { username: ticket.user.email, message });
    await mailgun.messages().send({ from: 'no-reply@demo.com', to: ticket.user.email, subject: 'Ticket Reply', html });
  }
  return replyData;
});

fastify.get('/admin/service-status', async (request) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  return await prisma.serviceStatus.findFirst({ orderBy: { updatedAt: 'desc' } });
});

fastify.post('/admin/service-status', async (request, reply) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  const { status, message } = request.body;
  const newStatus = await prisma.serviceStatus.create({ data: { status, message } });
  // Trigger notifications
  const users = await prisma.user.findMany();
  for (const user of users) {
    await prisma.notification.create({ data: { userId: user.id, message: `Service status: ${status} - ${message || ''}`, type: 'status' } });
  }
  // Optional email
  if (request.body.sendEmail) {
    const template = await prisma.emailTemplate.findFirst({ where: { name: 'service_announcement' } });
    if (template) {
      for (const user of users) {
        const html = renderMjml(template, { username: user.email, status, message });
        await mailgun.messages().send({ from: 'no-reply@demo.com', to: user.email, subject: 'Service Update', html });
      }
    }
  }
  await prisma.auditLog.create({ data: { adminId: request.user.id, action: 'status_updated', details: { status } } });
  return newStatus;
});

fastify.get('/admin/branding', async (request) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  return await prisma.branding.findFirst() || { primaryColor: '#0000FF', secondaryColor: '#333333', logoUrl: '', faviconUrl: '' };
});

fastify.put('/admin/branding', async (request, reply) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  const branding = await prisma.branding.upsert({ where: { id: 1 }, update: request.body, create: { id: 1, ...request.body } });
  await prisma.auditLog.create({ data: { adminId: request.user.id, action: 'branding_updated' } });
  return branding;
});

fastify.get('/admin/footer', async (request) => {
  return await prisma.footer.findFirst();
});

fastify.put('/admin/footer', async (request, reply) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  const footer = await prisma.footer.upsert({ where: { id: 1 }, update: { content: request.body.content }, create: { id: 1, content: request.body.content } });
  await prisma.auditLog.create({ data: { adminId: request.user.id, action: 'footer_updated' } });
  return footer;
});

fastify.get('/admin/page-titles', async (request) => {
  return await prisma.pageTitle.findMany();
});

fastify.put('/admin/page-titles/:id', async (request, reply) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  const title = await prisma.pageTitle.update({ where: { id: Number(request.params.id) }, data: request.body });
  await prisma.auditLog.create({ data: { adminId: request.user.id, action: 'page_title_updated', details: { id: title.id } } });
  return title;
});

fastify.get('/admin/tutorials', async (request) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  return await prisma.tutorial.findMany();
});

fastify.post('/admin/tutorials', async (request, reply) => {
  if (request.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  return await prisma.tutorial.create({ data: request.body });
});

 // Future payment endpoint

fastify.post('/api/payments', async (request, reply) => {
  // Stub for Stripe/PayPal
  const { userId, amount, method } = request.body;
  const transaction = await prisma.transaction.create({ data: { userId, amount, status: 'pending', method } });
  // Integrate gateway here
  // On success, update paymentStatus, subscription
  return transaction;
});

 // Cron for reminders

const cron = require('node-cron');
cron.schedule('0 0 * * *', async () => {
  const users = await prisma.user.findMany({ where: { subscriptionExpiration: { not: null } } });
  for (const user of users) {
    const daysLeft = Math.ceil((user.subscriptionExpiration - new Date()) / (24 * 60 * 60 * 1000));
    if ([1, 3, 7].includes(daysLeft)) {
      await prisma.notification.create({ data: { userId: user.id, message: `Subscription expires in ${daysLeft} days`, type: 'expiry' } });
      const template = await prisma.emailTemplate.findFirst({ where: { name: 'subscription_expiry', version: { gte: 0 } }, orderBy: { version: 'desc' } });
      const branding = await prisma.branding.findFirst() || { primaryColor: '#0000FF', secondaryColor: '#333333', logoUrl: '' };
      const emailData = {
        username: user.email,
        expiration_date: user.subscriptionExpiration.toISOString(),
        days_remaining: daysLeft,
        year: new Date().getFullYear(),
        primary_color: branding.primaryColor,
        secondary_color: branding.secondaryColor,
        logo_url: branding.logoUrl,
      };
      const html = renderMjml(template, emailData);
      await mailgun.messages().send({ from: 'no-reply@demo.com', to: user.email, subject: 'Subscription Reminder', html });
    }
  }
});

fastify.listen({ port: 3001 }, (err) => {
  if (err) throw err;
  console.log('Backend running on port 3001');
});