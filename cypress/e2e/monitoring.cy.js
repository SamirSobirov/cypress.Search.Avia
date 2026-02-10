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
    cy.viewport(1280, 800);
    cy.intercept('POST', '**/api/**').as('apiSearch');
    cy.visit('/home', { timeout: 30000 });

    cy.xpath("(//input[contains(@class,'input')])[1]", { timeout: 15000 })
      .should('be.visible')
      .click()
      .type(Cypress.env('LOGIN_EMAIL'), { log: false, delay: 50 });
    
    cy.xpath("(//input[contains(@class,'input')])[2]")
      .type(Cypress.env('LOGIN_PASSWORD'), { log: false, delay: 50 })
      .type('{enter}');

    cy.url().should('include', '/home');

    cy.get('#from').should('be.visible').click().clear().type('Ташкент', { delay: 150 });
    cy.get('[class*="p-autocomplete-item"]', { timeout: 15000 })
      .first()
      .should('be.visible')
      .click({ force: true }); 

    cy.get('#to').should('be.visible').click().clear().type('Москва', { delay: 150 });
    cy.get('[class*="p-autocomplete-item"]', { timeout: 15000 })
      .first()
      .should('be.visible')
      .click({ force: true }); 

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const day = targetDate.getDate();

    // Open datepicker and ensure it's visible
    cy.get("input[placeholder='Когда']").click();
    cy.get('.p-datepicker-calendar', { timeout: 10000 }).should('be.visible');

    // Try to select the day with a few retries (advance month if needed)
    const trySelectDay = (attemptsLeft = 3) => {
      if (attemptsLeft <= 0) {
        // let Cypress fail with a clear message if we couldn't find the date
        cy.get('.p-datepicker-calendar td')
          .not('.p-datepicker-other-month')
          .contains(new RegExp(`^${day}$`), { timeout: 10000 })
          .click({ force: true });
        return;
      }

      cy.get('.p-datepicker-calendar td')
        .not('.p-datepicker-other-month')
        .contains(new RegExp(`^${day}$`))
        .then($el => {
          if ($el && $el.length) {
            cy.wrap($el.first()).scrollIntoView().click({ force: true });
          } else {
            // advance month and retry
            cy.get('.p-datepicker-next').click();
            cy.wait(500);
            trySelectDay(attemptsLeft - 1);
          }
        });
    };

    trySelectDay(3);

    // Verify the input was updated with the selected day (simple check)
    cy.get("input[placeholder='Когда']").should($input => {
      const val = $input.val();
      if (!val || !new RegExp(`${day}`).test(val)) {
        throw new Error(`Date input not updated after selecting day ${day}, value="${val}"`);
      }
    });

    // Close picker
    cy.get('body').type('{esc}');

    cy.get('#search-btn', { timeout: 10000 })
      .should('be.visible')
      .and('not.be.disabled')
      .click();

    cy.wait('@apiSearch', { timeout: 30000 }).then((interception) => {
      const status = interception.response.statusCode;
      const responseBody = interception.response.body;

      // Log the status and response body for debugging
      cy.log(`API Status: ${status}`);
      cy.log(`API Response: ${JSON.stringify(responseBody)}`);

      if (status >= 200 && status < 300) {
        sendToTelegram(`<b>✅ Global Travel</b>\nСтатус API: <code>${status}</code>\nСистема работает исправно.`);
      } else {
        sendToTelegram(`<b>⚠️ Ошибка API</b>\nКод: <code>${status}</code>\nОтвет: <code>${JSON.stringify(responseBody)}</code>`);
      }
    });
  });

  afterEach(function() {
    if (this.currentTest.state === 'failed') {
      const testName = this.currentTest.title;
      const errorMessage = this.currentTest.err.message;
      sendToTelegram(
        `<b>❌ ТЕСТ УПАЛ</b>\n` +
        `Тест: <code>${testName}</code>\n` +
        `Ошибка: <code>${errorMessage}</code>`
      );
    }
  });
});