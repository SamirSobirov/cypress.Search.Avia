Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('ResizeObserver')) {
    return false;
  }
});

const formatDateForInput = (date) => {
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const getFutureDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const RU_MONTHS = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
];

const pickDatepickerDate = (date) => {
  const day = String(date.getDate());
  const monthName = RU_MONTHS[date.getMonth()];
  const year = String(date.getFullYear());

  // Кликаем нужный день: точное совпадение числа, не из соседнего месяца и не disabled.
  const clickDay = () => {
    cy.get('td.p-datepicker-day-cell:not(.p-datepicker-other-month) span.p-datepicker-day', {
      timeout: 15000,
    })
      .filter((i, el) => {
        const td = el.closest('td');
        const disabled =
          el.classList.contains('p-disabled') ||
          el.getAttribute('data-p-disabled') === 'true' ||
          (td && td.classList.contains('p-disabled'));
        return el.textContent.trim() === day && !disabled;
      })
      .first()
      .should('be.visible')
      .click({ force: true });
  };

  // Листаем вперёд, пока левый заголовок не покажет нужный месяц/год.
  const ensureMonth = (attemptsLeft) => {
    cy.get('.p-datepicker-title', { timeout: 15000 })
      .first()
      .invoke('text')
      .then((text) => {
        const t = text.trim().toLowerCase();
        if (t.includes(monthName) && t.includes(year)) {
          clickDay();
        } else if (attemptsLeft > 0) {
          cy.get('button.p-datepicker-next-button, [data-pc-name="pcnextbutton"]', {
            timeout: 10000,
          })
            .first()
            .click({ force: true });
          cy.wait(400);
          ensureMonth(attemptsLeft - 1);
        } else {
          throw new Error(`Не удалось долистать календарь до «${monthName} ${year}»`);
        }
      });
  };

  ensureMonth(14);
};

describe('Avia search flow', { pageLoadTimeout: 120000 }, () => {
  it('Авторизация и поиск билетов TAS → MOW без обратного билета', () => {
    const origin = 'Tas';
    const destination = 'Mow';
    const searchDate = formatDateForInput(getFutureDate(4));

    cy.viewport(1280, 800);
    cy.intercept('POST', '**/login**').as('apiAuth');
    cy.intercept('POST', '**/api/avia/search**').as('apiSearch');
    cy.intercept('GET', '**/api/avia/poll**').as('apiPoll');

    // Значения по умолчанию — если тест упадёт раньше, файлы для отчёта всё равно есть
    cy.writeFile('api_status.txt', 'UNKNOWN');
    cy.writeFile('offers_count.txt', 'N/A');

    cy.clearCookies();
    cy.clearLocalStorage();
    cy.window().then((win) => win.sessionStorage.clear());

    cy.visit('/');

    cy.env(['LOGIN_EMAIL', 'LOGIN_PASSWORD']).then((envVars) => {
      cy.get('input[type="text"], input[type="email"]', { timeout: 20000 })
        .first()
        .should('be.visible')
        .focus()
        .type(`{selectall}{backspace}${envVars.LOGIN_EMAIL}`, { delay: 50, log: false });

      cy.get('input[type="password"]', { timeout: 20000 })
        .should('be.visible')
        .focus()
        .type(`{selectall}{backspace}${envVars.LOGIN_PASSWORD}`, { delay: 50, log: false });

      cy.get('button[type="submit"], button')
        .contains(/Войти|Sign in|Login/i)
        .click({ force: true });
    });

    cy.wait('@apiAuth', { timeout: 30000 }).then((interception) => {
      const status = interception.response?.statusCode || 500;
      if (status >= 400) {
        throw new Error(`Auth failed: ${status}`);
      }
    });

    cy.url({ timeout: 30000 }).should('not.include', '/sign-in');

    cy.visit('https://b2b.metatrip.asia/flight/ru/home');
    cy.url({ timeout: 30000 }).should('include', '/flight/ru/home');

    cy.log('Заполняем маршрут');
    cy.get('input.avia-airport__input[placeholder="Откуда"]', { timeout: 20000 })
      .should('be.visible')
      .click({ force: true })
      .clear()
      .type(origin, { delay: 20 });

    cy.get('ul.avia-airport__list li.avia-airport__option', { timeout: 20000 })
      .first()
      .should('be.visible')
      .click({ force: true });

    cy.wait(300);

    cy.get('input.avia-airport__input[placeholder="Куда"]', { timeout: 20000 })
      .should('be.visible')
      .click({ force: true })
      .clear()
      .type(destination, { delay: 20 });

    cy.get('ul.avia-airport__list li.avia-airport__option', { timeout: 20000 })
      .first()
      .should('be.visible')
      .click({ force: true });

    cy.wait(500);

    const targetDate = getFutureDate(4);

    cy.log('Открываем выбор даты');
    cy.get('button.avia-date-range__field, button.avia-date-range__field[data-v-3712d418], button[data-testid="date-field"]', { timeout: 20000 })
      .first()
      .should('be.visible')
      .click({ force: true });

    cy.log('Выбираем дату в календаре');
    pickDatepickerDate(targetDate);

    cy.log('Нажимаем "Без обратного билета"');
    cy.get('button.avia-date-range__no-return, button[class*="no-return"], button')
      .contains(/Без обратного билета|No return|One-way|One way/i)
      .click({ force: true });

    cy.log('Нажимаем поиск');
    cy.get('button.avia-bar__submit-icon[aria-label="Поиск билета"], button.avia-bar__submit-icon', { timeout: 20000 })
      .should('be.visible')
      .click({ force: true });

    cy.log('Ожидаем результаты поиска');
    // Фиксируем статус API поиска для отчёта
    cy.wait('@apiSearch', { timeout: 45000 }).then((interception) => {
      const status = interception.response?.statusCode || 0;
      cy.writeFile('api_status.txt', `${status}`);
    });

    // Ждём первую порцию офферов (polling), чтобы не посчитать 0 раньше времени
    cy.wait('@apiPoll', { timeout: 45000 });

    const REQUIRED_STABLE_CHECKS = 3;
    const MAX_ATTEMPTS = 60; // 60 * 1500ms = до 90с ожидания под медленный CI

    // Считаем через body.find, чтобы отсутствие офферов не роняло тест (валидное «0»)
    const countOffers = () => cy.get('body').then(($body) => $body.find('div.offer-card').length);

    const waitForOffersToSettle = (prevCount = -1, stableChecks = 0, attempt = 0) => {
      // Останавливаемся только когда офферы уже появились И их количество стабилизировалось
      if (prevCount > 0 && stableChecks >= REQUIRED_STABLE_CHECKS) {
        return;
      }
      // Предохранитель от бесконечного ожидания (например, билетов действительно нет)
      if (attempt >= MAX_ATTEMPTS) {
        return;
      }
      cy.wait(1500);
      countOffers().then((currentCount) => {
        const nextStable = currentCount === prevCount ? stableChecks + 1 : 0;
        cy.log(`Подгрузка офферов… текущее количество: ${currentCount}`);
        waitForOffersToSettle(currentCount, nextStable, attempt + 1);
      });
    };

    waitForOffersToSettle();

    // Финальный точный подсчёт по классу offer-card
    cy.log('Считаем офферы');
    countOffers().then((count) => {
      cy.log(`Найдено офферов: ${count}`);
      cy.writeFile('offers_count.txt', `${count}`);
      expect(count).to.be.greaterThan(0);
    });
  });
});