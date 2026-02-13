// describe('Railway Product', () => {
//   it('Search Flow', () => {
//     cy.viewport(1280, 800);
    
//     // 1. ПЕРЕХВАТ API (замените URL на тот, который вызывается при поиске ЖД)
//     cy.intercept('POST', '**/railway/offers**').as('railSearch');

//     cy.visit('https://test.globaltravel.space/railway');

//     // 2. ЛОГИН (используем вашу рабочую логику через XPath)
//     cy.xpath("(//input[contains(@class,'input')])[1]").should('be.visible')
//       .type(Cypress.env('LOGIN_EMAIL'), { log: false });
//     cy.xpath("(//input[contains(@class,'input')])[2]")
//       .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');

//     cy.url({ timeout: 40000 }).should('include', '/railway');

//     // 3. ОТКУДА
//     cy.get('#from').click({force: true}).clear().type('Ташкент', { delay: 200 });
//     cy.wait(1000);
//     cy.get('#from').type('{enter}');
    
//     cy.wait(1000);

//     // 4. КУДА
//     cy.get('#to').click({force: true}).clear().type('Самарканд', { delay: 250 });
//     cy.wait(1500); 
//     cy.get('#to').type('{enter}');
//     cy.wait(1000);

//     // 5. ДАТА
//     cy.get("input[placeholder='Когда']").click();
//     const targetDay = new Date();
//     targetDay.setDate(targetDay.getDate() + 2); // Дата через 2 дня
//     const dayToSelect = targetDay.getDate();

//     cy.get('.p-datepicker-calendar td').not('.p-datepicker-other-month')
//       .contains(new RegExp(`^${dayToSelect}$`)).click({ force: true });

//     cy.get('body').type('{esc}');
//     cy.wait(2000); 

//     // 6. ПОИСК
//     cy.get('#search-btn').should('be.visible').click({ force: true });

//     // 7. ОЖИДАНИЕ ОТВЕТА API И ПРОВЕРКА 200
//     cy.wait('@railSearch', { timeout: 60000 }).then((interception) => {
//       expect(interception.response.statusCode).to.eq(200);
//     });
//   });
// });