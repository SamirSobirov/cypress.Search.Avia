describe('Global Travel Flow', () => {
  it('should login and search for tickets', () => {
    // 1. Заходим на сайт
    cy.visit('https://test.globaltravel.space/home');

    // 2. Логин
    // В Cypress переменные окружения берутся из Cypress.env() или cypress.env.json
    cy.xpath("(//input[contains(@class,'input')])[1]")
      .should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'));

    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'))
      .type('{enter}'); // Нажимаем Enter

    // Проверяем, что залогинились
    cy.url().should('include', '/home');

    // 3. Выбор маршрута "Откуда"
    cy.get('#from')
      .clear()
      .type('Ташкент', { delay: 100 })
      .type('{enter}');

    // 4. Выбор маршрута "Куда"
    cy.get('#to')
      .clear()
      .type('Москва', { delay: 100 })
      .type('{enter}');

    // 5. Выбор даты (через 2 дня)
    cy.get("input[placeholder='Когда']").click();

    const targetDay = new Date();
    targetDay.setDate(targetDay.getDate() + 2);
    const dayToSelect = targetDay.getDate();

    // Находим нужный день в календаре
    // Используем фильтр, чтобы не нажать на соседний месяц
    cy.get('.p-datepicker-calendar td')
      .not('.p-datepicker-other-month')
      .contains(new RegExp(`^${dayToSelect}$`)) // Точное совпадение числа
      .click();

    cy.get('body').type('{esc}');

    // 6. Поиск
    cy.get('#search-btn')
      .should('be.enabled')
      .click();
      
    cy.log('Поиск выполнен успешно');
  });
});

