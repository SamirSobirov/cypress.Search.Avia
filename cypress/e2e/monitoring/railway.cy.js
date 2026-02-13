describe('Railway Product', () => {
  it('Search Flow', () => {

    cy.viewport(1280, 800);
    cy.intercept('POST', '**/railway/offers**').as('railSearch');

    cy.visit('https://test.globaltravel.space/home');

    // ===== 1. LOGIN =====
    cy.xpath("(//input[contains(@class,'input')])[1]")
      .should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });

    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false })
      .type('{enter}');

    cy.url({ timeout: 40000 }).should('include', '/home');

    // ===== 2. ПЕРЕХОД В RAILWAY =====
    cy.visit('https://test.globaltravel.space/railway');

    // ===== 3. FROM =====
    cy.get('input[placeholder="Откуда"]')
      .click({ force: true })
      .clear()
      .type('Ташкент', { delay: 200 });

    cy.wait(1500);
    cy.get('input[placeholder="Откуда"]').type('{enter}');
    cy.wait(1000);

    // ===== 4. TO =====
    cy.get('input[placeholder="Куда"]')
      .click({ force: true })
      .clear()
      .type('Самарканд', { delay: 200 });

    cy.wait(1500);
    cy.get('input[placeholder="Куда"]').type('{enter}');
    cy.wait(1000);

    // ===== 5. DATE =====
    cy.get("input[placeholder='Когда']").click();

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const day = targetDate.getDate();

    cy.get('.p-datepicker-calendar td')
      .not('.p-datepicker-other-month')
      .contains(new RegExp(`^${day}$`))
      .click({ force: true });

    cy.get('body').type('{esc}');
    cy.wait(2000);

    // ===== 6. SEARCH =====
    cy.get('button.easy-button')
      .filter(':visible')
      .last()
      .click({ force: true });

    // ===== 7. API CHECK =====
    cy.wait('@railSearch', { timeout: 60000 })
      .its('response.statusCode')
      .should('eq', 200);

  });
});