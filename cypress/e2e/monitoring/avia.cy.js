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

   // 6. УМНАЯ ПРОВЕРКА БЕЗ ХАРДКОДА ВРЕМЕНИ

cy.wait('@apiSearch', { timeout: 60000 }).then((interception) => {
  const statusCode = interception.response.statusCode;
  cy.writeFile('api_status.txt', statusCode.toString());

  if (statusCode >= 400) {
    cy.log('🆘 Ошибка сервера API!');
    cy.writeFile('offers_count.txt', 'ERROR');
    return;
  }
});

// Ждем либо появления билетов, либо сообщения "ничего не найдено"
cy.get('body', { timeout: 60000 }).should(($body) => {
  const hasTickets = $body.find('.ticket-card:contains("Купить")').length > 0
    || $body.find('.ticket-card:contains("Выбрать")').length > 0
    || $body.find('.ticket-card:contains("UZS")').length > 0;

  const hasEmptyState = $body.text().includes('ничего не найдено')
    || $body.text().includes('Нет результатов');

  expect(hasTickets || hasEmptyState).to.be.true;
});

// После того как DOM стабилен — считаем билеты
cy.get('.ticket-card').then(($cards) => {

  let realTicketsCount = 0;

  $cards.each((index, el) => {
    const text = Cypress.$(el).text();
    if (
      text.includes('Купить') ||
      text.includes('Выбрать') ||
      text.includes('UZS')
    ) {
      realTicketsCount++;
    }
  });

  cy.log(`Debug: Total cards: ${$cards.length}`);
  cy.log(`Debug: Real tickets: ${realTicketsCount}`);

  cy.writeFile('offers_count.txt', realTicketsCount.toString());
});
  });
});