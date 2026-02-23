describe('Avia Product', () => {

  // Записываем дефолтные значения ДО начала теста. 
  // Если тест упадет посередине, CI прочитает эти данные и поймет, что был краш UI.
  before(() => {
    cy.writeFile('api_status.txt', 'UNKNOWN');
    cy.writeFile('offers_count.txt', 'N/A');
  });

  it('Search Flow with Smart Diagnostic', () => {
    cy.viewport(1280, 800);
    
    // Перехватываем только POST-запрос
    cy.intercept({ method: 'POST', url: '**/offers**' }).as('apiSearch');

    cy.visit('https://test.globaltravel.space/home');

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
    cy.get('#from').should('be.visible').click({force: true}).clear().type('Ташкент');
    cy.get('#from').should('have.value', 'Ташкент').type('{enter}'); // Ждем, пока значение точно применится

    // 3. КУДА
    cy.get('#to').should('be.visible').click({force: true}).clear().type('Москва');
    cy.get('#to').should('have.value', 'Москва').type('{enter}');

    // 4. ДАТА (Надежный вариант)
    cy.get("input[placeholder='Когда']").should('be.visible').click();
    
    // Ищем в календаре дни текущего месяца, ИСКЛЮЧАЯ недоступные (прошедшие) дни
    // Кликаем по 3-му доступному дню, чтобы точно не промахнуться при смене месяцев
    cy.get('.p-datepicker-calendar td')
      .not('.p-datepicker-other-month')
      .not('.p-disabled') 
      .eq(2) 
      .click({ force: true });
      
    cy.get('body').type('{esc}');

    // 5. ПОИСК
    cy.get('#search-btn').should('be.visible').click({ force: true });

    // 6. УМНАЯ ПРОВЕРКА
    cy.wait('@apiSearch', { timeout: 30000 }).then((interception) => {
      // Защита от undefined response
      const statusCode = interception.response?.statusCode || 500;
      cy.writeFile('api_status.txt', statusCode.toString());

      if (statusCode >= 400) {
        cy.writeFile('offers_count.txt', 'ERROR');
        throw new Error(`🆘 Ошибка сервера API: HTTP ${statusCode}`); // Cypress остановит тест здесь
      }
    });

    // Ожидание агрегации поставщиков
    // eslint-disable-next-line cypress/no-unnecessary-waiting
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
        cy.log('⚪ Билетов не найдено');
      }
    });
  });
});