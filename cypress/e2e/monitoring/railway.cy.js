describe('Railway Product', () => {
  it('Search Flow', () => {
    cy.viewport(1280, 800);
    cy.intercept('POST', '**/railway/offers**').as('railSearch');

    // 1. АВТОРИЗАЦИЯ (Твой рабочий XPath)
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

    // 3. ОТКУДА (Ввод + Клик по подсказке)
    cy.get('input[placeholder="Откуда"]', { timeout: 15000 })
      .should('be.visible')
      .click({ force: true })
      .type('Ташкент', { delay: 150 });
    
    // Кликаем по элементу списка p-listbox-item (как на твоем скрине)
    cy.get('li.p-listbox-item', { timeout: 10000 })
      .contains('ТАШКЕНТ')
      .should('be.visible')
      .click({ force: true });
    
    // 4. КУДА (Ввод + Клик по подсказке)
    cy.get('input[placeholder="Куда"]')
      .should('be.visible')
      .click({ force: true })
      .type('Самарканд', { delay: 150 });

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

    // 6. ПОИСК (Используем класс easy-button со скриншота)
cy.get('button.easy-button').filter(':visible').last()
      .should('be.visible')
      .click({ force: true });

    // 7. API ПРОВЕРКА
    cy.wait('@railSearch', { timeout: 60000 }).then((xhr) => {
      expect(xhr.response.statusCode).to.eq(200);
    });
  });
});