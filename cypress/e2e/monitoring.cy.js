describe('Scheduled Monitoring & Telegram Reporting', () => {
  const token = Cypress.env('TELEGRAM_TOKEN');
  const chatId = Cypress.env('TELEGRAM_CHAT_ID');

  const sendToTelegram = (message) => {
    if (!token || !chatId) return;
    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    cy.request({
      method: 'POST',
      url: `https://api.telegram.org/bot${token}/sendMessage`,
      failOnStatusCode: false,
      body: { 
        chat_id: chatId, 
        text: `${message}\n🕒 <i>Время проверки (UTC): ${time}</i>`, 
        parse_mode: 'HTML' 
      }
    });
  };

  it('Flow: Login -> Search -> Check Status', () => {
    // 0. Устанавливаем стандартное разрешение (важно для GitHub)
    cy.viewport(1280, 800);

    // Перехватываем API запросы
    cy.intercept('POST', '**/api/**').as('apiSearch');

    cy.visit('/home', { timeout: 30000 });

    // 1. Логин
    cy.xpath("(//input[contains(@class,'input')])[1]", { timeout: 15000 })
      .should('be.visible')
      .click() // Кликаем для фокуса
      .type(Cypress.env('LOGIN_EMAIL'), { log: false, delay: 50 });
    
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false, delay: 50 })
      .type('{enter}');

    cy.url().should('include', '/home');

    // 2. Пуленепробиваемый ввод городов
    // --- ОТКУДА ---
    cy.get('#from').should('be.visible').click().clear().type('Ташкент', { delay: 150 });
    // Ждем появления ЛЮБОГО элемента выпадашки по частичному классу
    cy.get('[class*="p-autocomplete-item"]', { timeout: 15000 })
      .first()
      .should('be.visible')
      .click({ force: true }); 

    // --- КУДА ---
    cy.get('#to').should('be.visible').click().clear().type('Москва', { delay: 150 });
    cy.get('[class*="p-autocomplete-item"]', { timeout: 15000 })
      .first()
      .should('be.visible')
      .click({ force: true }); 
    
    // 3. Выбор даты (через 2 дня)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const day = targetDate.getDate();
    
    cy.get("input[placeholder='Когда']").click();
    
    // Если дата переходит на следующий месяц
    if (day < new Date().getDate()) {
       cy.get('.p-datepicker-next').click();
    }

    cy.get('.p-datepicker-calendar td')
      .not('.p-datepicker-other-month')
      .contains(new RegExp(`^${day}$`))
      .click({ force: true });
    
    cy.get('body').type('{esc}');

    // 4. Клик по поиску
    // Добавляем ожидание, чтобы кнопка успела стать активной после выбора города
    cy.get('#search-btn', { timeout: 10000 })
      .should('be.visible')
      .and('not.be.disabled')
      .click();

    // Ждем ответа от API
    cy.wait('@apiSearch', { timeout: 30000 }).then((interception) => {
      const status = interception.response.statusCode;
      if (status >= 200 && status < 300) {
        sendToTelegram(`<b>✅ Global Travel</b>\nСтатус API: <code>${status}</code>\nСистема работает исправно.`);
      } else {
        sendToTelegram(`<b>⚠️ Ошибка API</b>\nКод: <code>${status}</code>`);
      }
    });
  });

  afterEach(function() {
    if (this.currentTest.state === 'failed') {
      sendToTelegram(`<b>❌ ТЕСТ УПАЛ</b>\nЛог: <code>${this.currentTest.err.message}</code>`);
    }
  });
});