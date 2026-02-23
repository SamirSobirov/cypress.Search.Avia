describe('Avia Product', () => {
  it('Search Flow', () => {
    // 0. ПОДГОТОВКА: Удаляем старый результат, чтобы бот не брал старые данные при ошибке
    cy.exec('rm offers_count.txt', { failOnNonZeroExit: false });

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

    // 6. ПРОВЕРКА РЕЗУЛЬТАТА
    // Ждем именно завершения сетевого запроса
    cy.wait('@apiSearch', { timeout: 40000 }).then((interception) => {
      cy.log('Статус API:', interception.response.statusCode);
      
      // Ждем, пока исчезнут лоадеры и появятся карточки
      cy.get('.ticket-card', { timeout: 15000 })
        .should('exist') // Сначала проверяем существование в DOM
        .then(($tickets) => {
          const count = $tickets.length;
          cy.log(`Найдено билетов: ${count}`);

          // Записываем актуальное число в файл для бота
          cy.writeFile('offers_count.txt', count.toString());
          
          expect(count).to.be.greaterThan(0);
        });
    });
  });
});