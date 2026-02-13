describe('Railway Product', () => {
  it('Search Flow', () => {
    cy.viewport(1280, 800);
    cy.intercept('POST', '**/railway/offers**').as('railSearch');

    // 1. Сначала заходим на ГЛАВНУЮ для логина
    cy.visit('https://test.globaltravel.space/home');

    // ЛОГИН (Ваша проверенная рабочая часть)
    cy.xpath("(//input[contains(@class,'input')])[1]").should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');

    // Ждем подтверждения логина
    cy.url({ timeout: 40000 }).should('include', '/home');

    // 2. ТЕПЕРЬ переходим в раздел ЖД
    cy.visit('https://test.globaltravel.space/railway');
    cy.url().should('include', '/railway');

    // 3. ОТКУДА
    cy.get('#from').should('be.visible').click({force: true}).clear().type('Ташкент', { delay: 200 });
    cy.wait(1000);
    cy.get('#from').type('{enter}');
    
    // 4. КУДА
    cy.get('#to').should('be.visible').click({force: true}).clear().type('Самарканд', { delay: 250 });
    cy.wait(1000);
    cy.get('#to').type('{enter}');

    // 5. ДАТА
    cy.get("input[placeholder='Когда']").click();
    const targetDay = new Date();
    targetDay.setDate(targetDay.getDate() + 2);
    const dayToSelect = targetDay.getDate();

    cy.get('.p-datepicker-calendar td').not('.p-datepicker-other-month')
      .contains(new RegExp(`^${dayToSelect}$`)).click({ force: true });

    cy.get('body').type('{esc}');
    cy.wait(1000); 

    // 6. ПОИСК
    cy.get('#search-btn').should('be.visible').click({ force: true });

    // 7. ЖДЕМ API
    cy.wait('@railSearch', { timeout: 60000 }).then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
    });
  });
});