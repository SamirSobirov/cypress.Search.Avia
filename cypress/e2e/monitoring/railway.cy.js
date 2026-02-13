describe('Railway Product', () => {
  it('Search Flow', () => {
    cy.viewport(1280, 800);
    cy.intercept('POST', '**/railway/offers**').as('railSearch');

    // 1. АВТОРИЗАЦИЯ 
    cy.visit('https://test.globaltravel.space/sign-in');

    cy.xpath("(//input[contains(@class,'input')])[1]", { timeout: 20000 })
      .should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });

    cy.xpath("(//input[contains(@class,'input')])[2]")
      .should('be.visible')
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false })
      .type('{enter}');

    cy.url({ timeout: 40000 }).should('include', '/home');

    // 2. ПЕРЕХОД В ЖД
    cy.visit('https://test.globaltravel.space/railway');

 // 3. ОТКУДА 
    cy.get('input[placeholder="Откуда"]', { timeout: 15000 })
      .should('be.visible')
      .click({ force: true })
      .type('Ташкент', { delay: 150 });
    
    // КЛИК ПО ПОДСКАЗКЕ ДЛЯ "ОТКУДА" (Перенеси сюда)
    cy.get('li.p-listbox-item', { timeout: 10000 })
      .contains('ТАШКЕНТ')
      .should('be.visible')
      .click({ force: true });
    
    // 4. КУДА 
    cy.get('input[placeholder="Куда"]')
      .should('be.visible')
      .click({ force: true })
      .type('Самарканд', { delay: 150 });

    // КЛИК ПО ПОДСКАЗКЕ ДЛЯ "КУДА"
    cy.get('li.p-listbox-item', { timeout: 10000 })
      .contains('САМАРКАНД')
      .should('be.visible')
      .click({ force: true });

    // 5. ДАТА
    cy.get("input[placeholder='Когда']").click();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const day = targetDate.getDate();

    cy.get('.p-datepicker-calendar td').not('.p-datepicker-other-month')
      .contains(new RegExp(`^${day}$`))
      .click({ force: true });

  cy.get('body').type('{esc}');
    cy.wait(1000);

    // 6. ПОИСК 
cy.get('button.easy-button')
      .should('have.length.at.least', 1) 
      .filter(':visible') // Игнорируем скрытые мобильные кнопки
      .last()             // Берем последнюю (обычно это Поиск)
      .should('not.be.disabled') // Ждем, пока она станет активной
      .click({ force: true });
    // 7. API ПРОВЕРКА
    cy.wait('@railSearch', { timeout: 60000 }).then((xhr) => {
      expect(xhr.response.statusCode).to.eq(200);
    });
  });
});

// force update