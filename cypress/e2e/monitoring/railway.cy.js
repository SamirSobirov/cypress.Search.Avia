describe('Railway Product', () => {
  it('Search Flow', () => {
    cy.viewport(1280, 800);
    // Интерцепт должен стоять до начала действий
    cy.intercept('POST', '**/railway/offers**').as('railSearch');

    cy.visit('https://test.globaltravel.space/sign-in');

    // 1. АВТОРИЗАЦИЯ (как в Avia)
    cy.xpath("(//input[contains(@class,'input')])[1]", { timeout: 20000 })
      .should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });

    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false })
      .type('{enter}');

    cy.url({ timeout: 40000 }).should('include', '/home');

    // Переход в раздел ЖД
    cy.visit('https://test.globaltravel.space/railway');

    // 2. ОТКУДА (Логика Avia: ввод -> пауза -> выбор)
    // В Railway используем плейсхолдер, так как ID нет
    cy.get('input[placeholder="Откуда"]', { timeout: 15000 })
      .should('be.visible')
      .click({ force: true })
      .clear()
      .type('Ташкент', { delay: 200 });
    
    cy.wait(1500); // Ждем подсказки как в Avia
    // Вместо {enter} кликаем по подсказке — это в 10 раз стабильнее для Railway
    cy.get('li.p-listbox-item').contains(/ТАШКЕНТ/i).click({ force: true });
    
    cy.wait(1000);

    // 3. КУДА (Логика Avia)
    cy.get('input[placeholder="Куда"]')
      .should('be.visible')
      .click({ force: true })
      .clear()
      .type('Самарканд', { delay: 200 });

    cy.wait(1500);
    cy.get('li.p-listbox-item').contains(/САМАРКАНД/i).click({ force: true });
    
    cy.wait(1000);

    // 4. ДАТА (Копируем логику Avia 1-в-1)
    cy.get("input[placeholder='Когда']").click();
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const day = targetDate.getDate();

    cy.get('.p-datepicker-calendar td').not('.p-datepicker-other-month')
      .contains(new RegExp(`^${day}$`))
      .click({ force: true });

    cy.get('body').type('{esc}');
    cy.wait(2000); 

    // 5. ПОИСК (Заменяем #search-btn на селектор Railway)
    // Используем фильтр :visible и .last() чтобы точно нажать на кнопку поиска
    cy.get('button.easy-button')
      .filter(':visible')
      .last()
      .should('be.visible')
      .click({ force: true });

    // 6. ПРОВЕРКА (API как в Avia)
    cy.wait('@railSearch', { timeout: 60000 }).then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
    });
  });
});