describe('Login', () => {
  it('logs in as demo user', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('user@demo.com');
    cy.get('input[type="password"]').type('User123!');
    cy.get('button').click();
    cy.url().should('include', '/dashboard');
  });
});
