describe('Avia Product', () => {
  it('Search Flow with Smart Diagnostic', () => {
    cy.viewport(1280, 800);
    
    // 1. Перехватываем запрос поиска
    cy.intercept('POST', '**/offers**').as('apiSearch');

    cy.visit('https://test.globaltravel.space/home');

    // 2. ЛОГИН 
    cy.visit('https://test.globaltravel.space/sign-in'); 
    cy.xpath("(//input[contains(@class,'input')])[1]").should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');
    
    cy.url({ timeout: 20000 }).should('include', '/home');
    cy.get('body').should('not.contain', 'Ошибка');

    // 3. ЗАПОЛНЕНИЕ ДАННЫХ (ОТКУДА / КУДА)
    cy.get('#from').click({force: true}).clear().type('Ташкент', { delay: 150 });
    cy.wait(1000);
    cy.get('#from').type('{enter}');
    
    cy.get('#to').click({force: true}).clear().type('Москва', { delay: 150 });
    cy.wait(1000); 
    cy.get('#to').type('{enter}');

    // 4. ВЫБОР ДАТЫ 
    cy.get("input[placeholder='Когда']").click();
    const targetDay = new Date();
    targetDay.setDate(targetDay.getDate() + 2);
    const dayToSelect = targetDay.getDate();

    cy.get('.p-datepicker-calendar td').not('.p-datepicker-other-month')
      .contains(new RegExp(`^${dayToSelect}$`))
      .click({ force: true });
    
    cy.get('body').type('{esc}');
    cy.wait(1000); 

    // 5. НАЖАТИЕ КНОПКИ ПОИСКА
    cy.get('#search-btn').should('be.visible').click({ force: true });

    // 6. УМНАЯ ПРОВЕРКА РЕЗУЛЬТАТОВ
    
    // Сначала ждем ответа от API, чтобы понять, не упал ли сервер
    cy.wait('@apiSearch', { timeout: 40000 }).then((interception) => {
      const statusCode = interception.response.statusCode;
      cy.writeFile('api_status.txt', statusCode.toString());

      if (statusCode >= 400) {
        cy.log(`🆘 Ошибка сервера: ${statusCode}`);
        cy.writeFile('offers_count.txt', '0'); 
        return; 
      }

      // Если API ответил 200, ждем отрисовки карточек
      cy.wait(15000); 

      cy.get('body').then(($body) => {
        // Ищем все карточки
        const allCards = $body.find('.ticket-card');
        let realTicketsCount = 0;

        // Фильтруем: считаем только те, где есть текст цены или кнопка
        allCards.each((index, el) => {
          const cardText = Cypress.$(el).text();
          if (cardText.includes('Купить') || cardText.includes('Выбрать') || cardText.includes('UZS')) {
            realTicketsCount++;
          }
        });

        // Записываем финальный результат
        if (realTicketsCount > 0) {
          cy.writeFile('offers_count.txt', realTicketsCount.toString());
          cy.log(`✅ Найдено реальных билетов: ${realTicketsCount}`);
        } else {
          cy.writeFile('offers_count.txt', '0');
          cy.log('⚪ Билетов не найдено');
        }
      });
    });
  });
});