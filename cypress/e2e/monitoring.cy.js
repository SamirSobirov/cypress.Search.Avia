describe('Scheduled Monitoring & Telegram Reporting', () => {
  // Теперь берем данные из переменных окружения (Secrets в GitHub)
  const token = Cypress.env('TELEGRAM_TOKEN');
  const chatId = Cypress.env('TELEGRAM_CHAT_ID');

  // Функция для отправки отчета в Telegram
  const sendToTelegram = (message) => {
    // Если токен или id не найдены, выводим ошибку в лог Cypress
    if (!token || !chatId) {
      cy.log('Ошибка: TELEGRAM_TOKEN или TELEGRAM_CHAT_ID не настроены в Secrets!');
      return;
    }

    cy.request({
      method: 'POST',
      url: `https://api.telegram.org/bot${token}/sendMessage`,
      failOnStatusCode: false, 
      body: {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      }
    });
  };

  it('Flow: Login -> Search -> Check Status', () => {
    // 1. Перехватываем API запросы (настрой маску под свой сайт, например **/api/search**)
    cy.intercept('POST', '**/api/**').as('apiSearch');

    cy.visit('/home');

    // 2. Авторизация (берем из секретов GitHub)
    cy.xpath("(//input[contains(@class,'input')])[1]")
      .should('be.visible')
      .type(Cypress.env('LOGIN_EMAIL'), { log: false });
    
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false })
      .type('{enter}');

    // Проверка успешного входа
    cy.url().should('include', '/home');

    // 3. Заполнение данных поиска
    cy.get('#from').should('be.visible').clear().type('Ташкент{enter}');
    cy.get('#to').clear().type('Москва{enter}');
    
    // Выбор даты (через 2 дня)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    
    cy.get("input[placeholder='Когда']").click();
    cy.get('.p-datepicker-calendar td')
      .not('.p-datepicker-other-month')
      .contains(new RegExp(`^${targetDate.getDate()}$`))
      .click();
    
    cy.get('body').type('{esc}');

    // 4. Клик по поиску
    cy.get('#search-btn').should('be.enabled').click();

    // 5. Ждем ответа от сервера и отправляем статус
    cy.wait('@apiSearch', { timeout: 20000 }).then((interception) => {
      const status = interception.response.statusCode;
      const duration = interception.response.duration;

      if (status >= 200 && status < 300) {
        sendToTelegram(`<b>✅ Global Travel: OK</b>\nСтатус: <code>${status}</code>\nСкорость: <code>${duration}ms</code>`);
      } else {
        sendToTelegram(`<b>⚠️ Global Travel: API Error</b>\nСтатус: <code>${status}</code>\nВнимание! Проверь работоспособность.`);
      }
    });
  });

  // Отправка уведомления, если тест упал на любом шаге (не нашел элемент, завис и т.д.)
  afterEach(function() {
    if (this.currentTest.state === 'failed') {
      const errMsg = this.currentTest.err.message;
      sendToTelegram(`<b>❌ Global Travel: ТЕСТ УПАЛ</b>\nОшибка: <i>${errMsg}</i>`);
    }
  });
});