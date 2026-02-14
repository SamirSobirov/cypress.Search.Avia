describe('Railway Product', () => {
  it('Search Flow', () => {
    cy.viewport(1280, 800);
    
    // 1. Интерцепт (оставляем wildcard для гибкости)
    cy.intercept('POST', '**/railway/offers**').as('railSearch');

    cy.visit('https://test.globaltravel.space/sign-in');

    // Авторизация
    cy.xpath("(//input[contains(@class,'input')])[1]", { timeout: 20000 })
      .should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });

    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false })
      .type('{enter}');

    cy.url({ timeout: 40000 }).should('include', '/home');

    // Переход в раздел ЖД
    cy.visit('https://test.globaltravel.space/railway');

    // 2. ОТКУДА
    cy.get('input[placeholder="Откуда"]', { timeout: 15000 })
      .should('be.visible')
      .click({ force: true })
      .clear() // Добавил очистку для надежности
      .type('Ташкент', { delay: 100 });
    
    cy.get('.p-listbox-item', { timeout: 10000 })
      .contains(/ТАШКЕНТ/i)
      .click({ force: true });
    
    // 3. КУДА
    cy.get('input[placeholder="Куда"]')
      .should('be.visible')
      .click({ force: true })
      .clear()
      .type('Самарканд', { delay: 100 });

    cy.get('.p-listbox-item', { timeout: 10000 })
      .contains(/САМАРКАНД/i)
      .click({ force: true });

    // 4. ДАТА
    cy.get("input[placeholder='Когда']").click({ force: true });
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const day = targetDate.getDate();

    cy.get('.p-datepicker-calendar td:not(.p-datepicker-other-month)')
      .contains(new RegExp(`^${day}$`))
      .should('be.visible')
      .click({ force: true });

    // Закрываем календарь и даем время на исчезновение оверлея
    cy.get('body').type('{esc}');
    cy.wait(500); 

    // 5. ПОИСК (Исправленный селектор для кнопки-лупы)
 cy.get('button.easy-button.p-button-icon-only')
      .should('be.visible')
      .click({ force: true });

    // 6. ПРОВЕРКА (Ждем API)
    cy.wait('@railSearch', { timeout: 60000 }).then((interception) => {
      expect([200, 201]).to.include(interception.response.statusCode);
      
      // Проверка, что после клика появились результаты (карточки)
      // Если класс карточек другой, замените .offer-item на актуальный
      cy.get('.offer-item', { timeout: 20000 }).should('be.visible');
    });
  });
});