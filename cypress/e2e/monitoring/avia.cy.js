describe('Avia Product', () => {
  it('Search Flow', () => {
    cy.viewport(1280, 800);
    cy.intercept('POST', '**/offers**').as('apiSearch');

    cy.visit('https://test.globaltravel.space/home');

   // 1. ЛОГИН 
    cy.visit('https://test.globaltravel.space/sign-in'); 

    cy.xpath("(//input[contains(@class,'input')])[1]").should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');

    cy.url({ timeout: 20000 }).should('include', '/home');
    
    cy.get('body').should('not.contain', 'Ошибка');

    // 2. ОТКУДА
    cy.get('#from').click({force: true}).clear().type('Ташкент', { delay: 200 });
    cy.wait(1000);
    cy.get('#from').type('{enter}');
    
    cy.wait(1000);

    // 3. КУДА
    cy.get('#to').click({force: true}).clear().type('Москва', { delay: 250 });
    cy.wait(1500); 
    cy.get('#to').type('{enter}');
    cy.wait(1000);

    // 4. ДАТА 
    cy.get("input[placeholder='Когда']").click();
    
    const targetDay = new Date();
    targetDay.setDate(targetDay.getDate() + 2);
    const dayToSelect = targetDay.getDate();

    cy.get('.p-datepicker-calendar td').not('.p-datepicker-other-month')
      .contains(new RegExp(`^${dayToSelect}$`))
      .click({ force: true });

    cy.get('body').type('{esc}');
    cy.wait(2000); 

    // 5. ПОИСК
    cy.get('#search-btn').should('be.visible').click({ force: true });

// 6. ПРОВЕРКА РЕЗУЛЬТАТА (Умный поиск для Авиа)
    // Ждем появления хотя бы одной карточки с правильным классом .ticket-card
    cy.get('.ticket-card', { timeout: 40000 }).should('be.visible');

    // Теперь, когда карточки ТОЧНО отрисовались, берем данные
    // Мы не просто ждем API, мы считаем реальные карточки на странице
    cy.get('.ticket-card').then(($tickets) => {
      const count = $tickets.length;
      cy.log(`Успех! Найдено реальных билетов на странице: ${count}`);

      // Записываем финальное число для Telegram
      cy.writeFile('offers_count.txt', count.toString());
      
      // Дополнительно проверяем последний API запрос для логов
      cy.wait('@apiSearch').then((interception) => {
        cy.log('Последний статус API:', interception.response.statusCode);
      });

      // Тест пройдет успешно, так как count > 0
      expect(count).to.be.greaterThan(0);
    });
  });
});