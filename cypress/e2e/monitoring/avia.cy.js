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

    // 6. УМНАЯ ПРОВЕРКА (С УЧЕТОМ ДОЛГОЙ ЗАГРУЗКИ)
    
    // Ждем первый ответ сервера, чтобы записать статус API (жив ли бэкенд в принципе)
    cy.wait('@apiSearch', { timeout: 30000 }).then((interception) => {
      const statusCode = interception.response.statusCode;
      cy.writeFile('api_status.txt', statusCode.toString());

      if (statusCode >= 400) {
        cy.log('🆘 Ошибка сервера API!');
        cy.writeFile('offers_count.txt', 'ERROR');
        return; // Прерываем дальнейшие проверки
      }
    });

    // Если бэкенд жив (200), начинается магия.
    // Так как авиа-поиск делает множество запросов и билеты появляются не сразу,
    // даем интерфейсу время на прогрузку всех поставщиков.
    cy.wait(15000); // Жесткое ожидание 15 секунд для стабилизации DOM (важно для CI/CD)

    cy.get('body').then(($body) => {
      // Ищем все элементы с классом ticket-card
      const allCards = $body.find('.ticket-card');
      
      let realTicketsCount = 0;

      // Перебираем каждую карточку и проверяем, есть ли внутри нее текст реального билета
      // Скелетоны пустые, а в реальном билете есть кнопка "Купить" или "Выбрать"
      allCards.each((index, el) => {
        const cardText = Cypress.$(el).text();
        if (cardText.includes('Купить') || cardText.includes('Выбрать') || cardText.includes('UZS')) {
          realTicketsCount++;
        }
      });

      if (realTicketsCount > 0) {
        // Нашли настоящие билеты
        cy.writeFile('offers_count.txt', realTicketsCount.toString());
        cy.log(`✅ Найдено реальных билетов: ${realTicketsCount}`);
      } else {
        // Билетов нет (либо ничего не найдено, либо страница пустая)
        cy.writeFile('offers_count.txt', '0');
        cy.log('⚪ Билетов не найдено');
      }
    });
  });
});