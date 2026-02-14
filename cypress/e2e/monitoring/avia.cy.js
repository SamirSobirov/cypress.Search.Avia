describe('Avia Product', () => {
  it('Search Flow', () => {
    cy.viewport(1280, 800);
    cy.intercept('POST', '**/offers**').as('apiSearch');

    cy.visit('https://test.globaltravel.space/home');

    // 1. ЛОГИН 
    cy.xpath("(//input[contains(@class,'input')])[1]").should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');

    cy.url({ timeout: 40000 }).should('include', '/home');

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

  // 6. ПРОВЕРКА РЕЗУЛЬТАТА (API)
    cy.wait('@apiSearch', { timeout: 60000 }).then((interception) => {
      expect(interception.response.statusCode).to.eq(200);

      // Извлекаем количество билетов. 
      // Если структура ответа: { offers: [...] }, используем .length
      // Если структура другая, подправь путь к массиву.
      const offers = interception.response.body.offers || [];
      const count = offers.length;

      // Создаем файл, который прочитает GitHub Actions
      cy.writeFile('offers_count.txt', count.toString());
    });
  });
});