describe('Avia Product', () => {

  // Записываем дефолтные значения ДО начала теста (чтобы бот всегда получал статус)
  before(() => {
    cy.writeFile('api_status.txt', 'UNKNOWN');
    cy.writeFile('offers_count.txt', 'N/A');
  });

  it('Search Flow with Smart Diagnostic', () => {
    cy.viewport(1280, 800);

    // Перехватываем API поиска
    cy.intercept({ method: 'POST', url: '**/offers**' }).as('apiSearch');

    // 1. ЛОГИН (Убрали лишний cy.visit на /home, идем сразу на sign-in)
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
    // Добавляем delay, чтобы сымитировать ввод человека и дать API отдать города
    cy.get('#from').type('Ташкент', { delay: 100 }); 
    cy.wait(1000); // Ждем отрисовку выпадающего списка
    cy.get('#from').type('{enter}');

    // 3. КУДА
    cy.get('#to').should('be.visible').click({ force: true }).clear();
    cy.get('#to').type('Москва', { delay: 100 });
    cy.wait(1000);
    cy.get('#to').type('{enter}');

    // 4. ДАТА (Твой надежный вариант, адаптированный под CI)
    
    // Кликаем первый раз
    cy.get("input[placeholder='Когда']").should('be.visible').click();

    // Даем CI время на обработку первого клика и проверяем, нужно ли кликать второй раз
    cy.get('body').then(($body) => {
      // Если календарь всё ещё не появился в DOM, делаем твой спасительный второй клик
      if ($body.find('.p-datepicker-calendar').length === 0) {
        cy.get("input[placeholder='Когда']").click({ force: true });
      }
    });

    // Обязательно ждем, чтобы таблица календаря стала видимой для Cypress
    cy.get('.p-datepicker-calendar').should('be.visible');

    const today = new Date();
    const targetDay = new Date();
    targetDay.setDate(today.getDate() + 2);

    const dayToSelect = targetDay.getDate();

    // 🛡 ЗАЩИТА ДЛЯ CI: Если +2 дня перекинули нас в следующий месяц
    // (например, с 28 февраля на 2 марта), нужно переключить календарь вперед!
    if (targetDay.getMonth() !== today.getMonth()) {
      // Ищем кнопку следующего месяца (уточни класс, обычно в таких календарях это .p-datepicker-next)
      cy.get('.p-datepicker-next').should('be.visible').click({ force: true });
      cy.wait(500); // Ждем анимацию смены месяца
    }

    // Твой поиск нужного дня через регулярное выражение
    cy.get('.p-datepicker-calendar td')
      .not('.p-datepicker-other-month')
      .not('.p-disabled') // Обязательно исключаем заблокированные дни
      .contains(new RegExp(`^${dayToSelect}$`))
      .click({ force: true });

    cy.get('body').type('{esc}');
    cy.wait(1000);

    // 5. ПОИСК
    cy.get('#search-btn').should('be.visible').click({ force: true });

    // 6. УМНАЯ ПРОВЕРКА
    // Ждем ПЕРВЫЙ ответ от API
    cy.wait('@apiSearch', { timeout: 30000 }).then((interception) => {
      const statusCode = interception.response?.statusCode || 500;
      cy.writeFile('api_status.txt', statusCode.toString());

      if (statusCode >= 400) {
        cy.writeFile('offers_count.txt', 'ERROR');
        throw new Error(`🆘 Ошибка сервера API: HTTP ${statusCode}`);
      }
    });

    // Ожидание агрегации поставщиков (раз у вас их много)
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(15000);

    cy.get('body').then(($body) => {
      const allCards = $body.find('.ticket-card');
      let realTicketsCount = 0;

      // Ищем карточки, в которых реально подгрузились кнопки покупки
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