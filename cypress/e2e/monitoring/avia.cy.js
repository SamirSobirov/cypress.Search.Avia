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
    
    // Кликаем первый раз
    cy.get("input[placeholder='Когда']").should('be.visible').click();

    cy.get('body').then(($body) => {
      if ($body.find('.p-datepicker-calendar').length === 0) {
        cy.get("input[placeholder='Когда']").click({ force: true });
      }
    });

    cy.get('.p-datepicker-calendar').should('be.visible');

    const today = new Date();
    const targetDay = new Date();
    targetDay.setDate(today.getDate() + 2);

    const dayToSelect = targetDay.getDate();

    if (targetDay.getMonth() !== today.getMonth()) {
      cy.get('.p-datepicker-next').should('be.visible').click({ force: true });
      cy.wait(500); 
    }

    cy.get('.p-datepicker-calendar td')
      .not('.p-datepicker-other-month')
      .not('.p-disabled') 
      .contains(new RegExp(`^${dayToSelect}$`))
      .click({ force: true });

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