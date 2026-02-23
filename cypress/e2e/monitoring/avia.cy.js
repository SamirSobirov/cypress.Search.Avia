describe('Avia Product', () => {
  it('Search Flow with Smart Diagnostic', () => {
    cy.viewport(1280, 800);
    cy.intercept('POST', '**/offers**').as('apiSearch');

    // Очищаем старые файлы в начале теста (гарантия свежих данных)
    cy.writeFile('api_status.txt', 'NONE');
    cy.writeFile('offers_count.txt', '0');

    cy.visit('https://test.globaltravel.space/sign-in'); 
    cy.xpath("(//input[contains(@class,'input')])[1]").should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false }).type('{enter}');
    
    cy.url({ timeout: 20000 }).should('include', '/home');

    // Ввод данных (From/To/Date) - оставляем как у тебя, это работает стабильно
    cy.get('#from').click({force: true}).type('Ташкент{enter}');
    cy.wait(500);
    cy.get('#to').click({force: true}).type('Москва{enter}');
    cy.get("input[placeholder='Когда']").click();
    
    const targetDay = new Date();
    targetDay.setDate(targetDay.getDate() + 2);
    cy.get('.p-datepicker-calendar td').not('.p-datepicker-other-month')
      .contains(new RegExp(`^${targetDay.getDate()}$`)).click({ force: true });
    
    cy.get('body').type('{esc}');
    cy.get('#search-btn').should('be.visible').click({ force: true });

    // === ПРОВЕРКА РЕЗУЛЬТАТОВ ===
    cy.wait('@apiSearch', { timeout: 40000 }).then((interception) => {
      cy.writeFile('api_status.txt', interception.response.statusCode.toString());
    });

    // Ждем, пока исчезнут лоадеры или скелетоны (важный шаг!)
    // Если на сайте есть индикатор загрузки, добавь его селектор сюда:
    cy.get('.skeleton, .loading-indicator', { timeout: 20000 }).should('not.exist');
    cy.wait(5000); // Даем финальные 5 сек на отрисовку цен

    cy.get('body').then(($body) => {
      // Ищем карточки, которые реально содержат цену (например, текст "UZS")
      // и кнопку выбора. Это отсекает пустые скелетоны.
      const realTickets = $body.find('.ticket-card').filter((i, el) => {
        const text = Cypress.$(el).text();
        return (text.includes('Выбрать') || text.includes('Купить')) && text.includes('UZS');
      });

      const count = realTickets.length;
      cy.writeFile('offers_count.txt', count.toString());
      cy.log(count > 0 ? `✅ Найдено: ${count}` : '⚪ Билетов не найдено');
    });
  });
});