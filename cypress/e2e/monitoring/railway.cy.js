describe('Railway Product', () => {
  it('Search Flow', () => {

    cy.viewport(1280, 800);
    cy.intercept('POST', '**/railway/offers**').as('railSearch');

    // ===== 1. LOGIN =====
    cy.visit('https://test.globaltravel.space/sign-in');

    cy.xpath("(//input[contains(@class,'input')])[1]", { timeout: 30000 })
      .should('be.visible')
      .clear()
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });

    cy.xpath("(//input[contains(@class,'input')])[2]")
      .should('be.visible')
      .clear()
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false })
      .type('{enter}');

    cy.url({ timeout: 60000 }).should('include', '/home');

    // ===== 2. RAILWAY PAGE =====
    cy.visit('https://test.globaltravel.space/railway');
    cy.url({ timeout: 60000 }).should('include', '/railway');

    // ждём пока страница полностью загрузится
    cy.get('input[placeholder="Откуда"]', { timeout: 30000 })
      .should('be.visible');

    // ===== 3. FROM =====
    cy.get('input[placeholder="Откуда"]')
      .click()
      .clear()
      .type('Ташкент', { delay: 50 });

    // ждём появления dropdown
    cy.get('.p-listbox', { timeout: 20000 })
      .should('be.visible');

    cy.contains('.p-listbox-item', 'ТАШКЕНТ', { timeout: 20000 })
      .should('be.visible')
      .click();

    cy.get('input[placeholder="Откуда"]')
      .should('have.value')
      .and('not.be.empty');

    // ===== 4. TO =====
    cy.get('input[placeholder="Куда"]')
      .click()
      .clear()
      .type('Самарканд', { delay: 50 });

    cy.get('.p-listbox', { timeout: 20000 })
      .should('be.visible');

    cy.contains('.p-listbox-item', 'САМАРКАНД', { timeout: 20000 })
      .should('be.visible')
      .click();

    cy.get('input[placeholder="Куда"]')
      .should('have.value')
      .and('not.be.empty');

    // ===== 5. DATE =====
    cy.get("input[placeholder='Когда']")
      .should('be.visible')
      .click();

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const day = targetDate.getDate();

    cy.get('.p-datepicker-calendar td:not(.p-datepicker-other-month)', { timeout: 20000 })
      .contains(new RegExp(`^${day}$`))
      .should('be.visible')
      .click();

    cy.get('body').type('{esc}');

    // ===== 6. SEARCH =====
    cy.contains('button.easy-button', 'Поиск', { timeout: 20000 })
      .should('be.visible')
      .and('not.be.disabled')
      .click();

    // ===== 7. API CHECK =====
    cy.wait('@railSearch', { timeout: 90000 })
      .its('response.statusCode')
      .should('eq', 200);

  });
});