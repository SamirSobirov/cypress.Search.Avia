describe('Avia Product', () => {

  before(() => {
    cy.writeFile('api_status.txt', 'UNKNOWN');
    cy.writeFile('offers_count.txt', 'N/A');
  });

  it('Search Flow with Smart Diagnostic', () => {
    cy.viewport(1280, 800);

    cy.intercept({ method: 'POST', url: '**/offers**' }).as('apiSearch');

    // 1. ЛОГИН 
    cy.visit('https://test.globaltravel.space/sign-in');
    
    cy.xpath("(//input[contains(@class,'input')])[1]")
      .should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });

    cy.xpath("(//input[contains(@class,'input')])[2]")
      .should('be.visible')
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false })
      .type('{enter}');

    cy.url({ timeout: 20000 }).should('include', '/home');
    cy.get('body').should('not.contain', 'Ошибка');

    // 2. ОТКУДА
    cy.get('#from').should('be.visible').click({ force: true }).clear();
    cy.get('#from').type('Ташкент', { delay: 100 }); 
    cy.wait(1000); 
    cy.get('#from').type('{enter}');

    // 3. КУДА
    cy.get('#to').should('be.visible').click({ force: true }).clear();
    cy.get('#to').type('Москва', { delay: 100 });
    cy.wait(1000);
    cy.get('#to').type('{enter}');
    
   // 4. ДАТА (Надежная логика смены месяцев)
    cy.get("input[placeholder='Когда']").should('be.visible').click({ force: true });

    cy.get('body').then(($body) => {
      // Если календарь не вылез с первого клика - дублируем
      if ($body.find('.p-datepicker-calendar').length === 0) {
        cy.get("input[placeholder='Когда']").click({ force: true });
      }
    });

    cy.get('.p-datepicker-calendar').should('be.visible');

    // JS Date автоматически учитывает високосные года и переход месяцев (27 фев + 2 = 1 марта)
    const today = new Date();
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + 2);

    const dayToSelect = targetDate.getDate();       // Число (например, 1)
    const targetMonth = targetDate.getMonth();      // Целевой месяц
    const currentMonth = today.getMonth();          // Текущий месяц

    // Если дата выпадает на следующий месяц (или год)
    if (targetMonth !== currentMonth) {
      cy.get('.p-datepicker-next')
        .filter(':visible') // Ищем только видимую кнопку
        .first() 
        .should('be.visible')
        .click({ force: true });
      cy.wait(500); // Обязательно даем время на анимацию перелистывания
    }

    // Ищем точное число ТОЛЬКО внутри активного месяца и кликаем
    cy.get('.p-datepicker-calendar').filter(':visible')
      .find('td:not(.p-datepicker-other-month):not(.p-disabled)')
      .contains(new RegExp(`^${dayToSelect}$`))
      .first() // Гарантирует, что кликнет только один раз
      .click({ force: true });

    // Закрываем календарь
    cy.get('body').type('{esc}');
    cy.wait(1000);
    // 5. ПОИСК
    cy.get('#search-btn').should('be.visible').click({ force: true });

    // 6. УМНАЯ ПРОВЕРКА
    cy.wait('@apiSearch', { timeout: 30000 }).then((interception) => {
      const statusCode = interception.response?.statusCode || 500;
      cy.writeFile('api_status.txt', statusCode.toString());

      if (statusCode >= 400) {
        cy.writeFile('offers_count.txt', 'ERROR');
        throw new Error(`🆘 Ошибка сервера API: HTTP ${statusCode}`);
      }
    });

    cy.wait(15000);

    cy.get('body').then(($body) => {
      const allCards = $body.find('.ticket-card');
      let realTicketsCount = 0;

      allCards.each((index, el) => {
        const cardText = Cypress.$(el).text();
        if (cardText.includes('Купить') || cardText.includes('Выбрать') || cardText.includes('UZS')) {
          realTicketsCount++;
        }
      });

      if (realTicketsCount > 0) {
        cy.writeFile('offers_count.txt', realTicketsCount.toString());
        cy.log(`✅ Найдено реальных билетов: ${realTicketsCount}`);
      } else {
        cy.writeFile('offers_count.txt', '0');
        cy.log('⚪ Билетов не найдено (или долгая загрузка)');
      }
    });
  });
});