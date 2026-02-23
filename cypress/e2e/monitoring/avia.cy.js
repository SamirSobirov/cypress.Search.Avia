describe('Avia Product', () => {
  it('Search Flow with Smart Diagnostic', () => {
    cy.viewport(1280, 800);
    
    // Перехватываем запрос и задаем алиас
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
    cy.get('#from').click({force: true}).clear().type('Ташкент', { delay: 150 });
    cy.wait(1000);
    cy.get('#from').type('{enter}');
    cy.wait(1000);

    // 3. КУДА
    cy.get('#to').click({force: true}).clear().type('Москва', { delay: 150 });
    cy.wait(1000); 
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
    cy.wait(1000); 

    // 5. ПОИСК
    cy.get('#search-btn').should('be.visible').click({ force: true });

    // 6. УМНАЯ ПРОВЕРКА РЕЗУЛЬТАТА И СЕТИ
    cy.wait('@apiSearch', { timeout: 60000 }).then((interception) => {
      const statusCode = interception.response.statusCode;
      cy.log(`Статус API: ${statusCode}`);
      
      // Записываем код ответа для GitHub Actions
      cy.writeFile('api_status.txt', statusCode.toString());

      if (statusCode >= 400) {
        // Если сервер упал (500) или выдал другую ошибку
        cy.log('🆘 Ошибка сервера!');
        cy.writeFile('offers_count.txt', 'ERROR');
      } else {
        // Если сервер ответил 200 OK
        cy.wait(3000); // Даем время скелетонам исчезнуть, а реальным карточкам отрендериться

        cy.get('body').then(($body) => {
          // Проверяем, есть ли карточки
          const allCards = $body.find('.ticket-card');
          
          if (allCards.length === 0 || $body.text().includes('Не найдено') || $body.text().includes('No results')) {
            // Билетов действительно нет
            cy.writeFile('offers_count.txt', '0');
            cy.log('Билетов не найдено');
          } else {
            // Фильтруем скелетоны: у реальной карточки внутри есть какой-то текст (цена, время и т.д.)
            const realTickets = allCards.filter((index, el) => Cypress.$(el).text().trim().length > 0);
            const count = realTickets.length;
            
            cy.writeFile('offers_count.txt', count.toString());
            cy.log(`Найдено реальных билетов: ${count}`);
          }
        });
      }
    });
  });
});