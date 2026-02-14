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
      // Проверяем статус
      expect(interception.response.statusCode).to.be.oneOf([200, 201]);

      const body = interception.response.body;
      
      // Логируем структуру в консоль Cypress для проверки
      cy.log('DEBUG: API Body keys:', Object.keys(body).join(', '));

      // Улучшенный поиск массива: ищем в body.offers, body.data, body.flights или в самом body
      const offersList = body.offers || body.data || body.flights || (Array.isArray(body) ? body : []);
      const count = offersList.length;

      cy.log(`DEBUG: Found ${count} offers`);

      // Записываем файл
      cy.writeFile('offers_count.txt', count.toString());
      
      // Дополнительная проверка: ждем, пока на странице появится хотя бы одна карточка
      // Замени '.offer-item' на реальный класс карточки билета, если он другой
      if (count > 0) {
        cy.get('.offer-item', { timeout: 15000 }).should('exist');
      }
    });
  });
});