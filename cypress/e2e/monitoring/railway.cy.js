describe('Railway Product', () => {
  it('Search Flow', () => {
    cy.viewport(1280, 800);
    // 0. Интерцепт ставим в самом начале
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

 // ===== 3. ОТКУДА =====
    cy.get('input[placeholder="Откуда"]', { timeout: 15000 })
      .should('be.visible')
      .click({ force: true })
      .type('Ташкент', { delay: 200 }); // Увеличили задержку печати

    // Вместо простого клика ждем, пока в DOM появится нужный пункт
    cy.get('li.p-listbox-item', { timeout: 15000 })
      .contains(/ТАШКЕНТ/i) // /i делает поиск нечувствительным к регистру
      .should('be.visible')
      .click({ force: true });

    // ===== 4. КУДА =====
    cy.get('input[placeholder="Куда"]')
      .should('be.visible')
      .click({ force: true })
      .type('Самарканд', { delay: 200 });

    cy.get('li.p-listbox-item', { timeout: 15000 })
      .contains(/САМАРКАНД/i)
      .should('be.visible')
      .click({ force: true });

    // 5. ДАТА
    cy.get("input[placeholder='Когда']").click();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const day = targetDate.getDate();

    // Ждем, пока календарь отрисуется
    cy.get('.p-datepicker-calendar', { timeout: 10000 }).should('be.visible');
    cy.get('.p-datepicker-calendar td').not('.p-datepicker-other-month')
      .contains(new RegExp(`^${day}$`))
      .click({ force: true });

    cy.get('body').type('{esc}');
    cy.wait(1500); // Даем время форме "собраться" после выбора даты

    // 6. ПОИСК 
    // Уточняем селектор: ищем кнопку с классом easy-button, которая НЕ является переключателем
    cy.get('button.easy-button')
      .filter(':visible')
      .last() 
      .should('not.be.disabled')
      .click({ force: true });

    // 7. API ПРОВЕРКА
    // В GitHub Actions лучше проверять через .then и interception
    cy.wait('@railSearch', { timeout: 80000 }).then((interception) => {
      assert.isNotNull(interception.response, 'API did not respond');
      expect(interception.response.statusCode).to.eq(200);
    });
  });
});