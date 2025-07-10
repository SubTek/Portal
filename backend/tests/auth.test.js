const fastify = require('fastify');
const app = require('../src/server'); // adjusted

describe('Auth Tests', () => {
  let server;

  beforeAll(() => {
    server = fastify();
    server.register(app);
  });

  it('should login with demo admin', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/login',
      payload: { email: 'admin@demo.com', password: 'Admin123!' }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('token');
  });

  // Add more tests for other endpoints
});