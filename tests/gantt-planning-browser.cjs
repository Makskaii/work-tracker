const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const stages = [{ id: 99, projectId: '31', title: 'Оплаты', code: 'payments', stageType: 'payments', isDefault: true, isGroup: false, parentStageId: null, groupStatus: 'not_started', plannedHours: null, sortOrder: 0 }];
const events = [];
for (let index = 0; index < 8; index++) {
  const root = index * 3 + 1;
  stages.push({ id: root, projectId: '31', title: `Этап ${index + 1}`, code: `group-${root}`, stageType: 'development', isGroup: true, parentStageId: null, plannedHours: 30, groupStatus: 'in_progress', dependsOnStageId: null, dependencyAnchor: null, durationDays: null, sortOrder: root });
  for (let child = 1; child <= 2; child++) {
    const id = root + child;
    stages.push({ id, projectId: '31', title: `Подэтап ${id}`, code: `child-${id}`, stageType: 'development', isGroup: false, parentStageId: root, plannedHours: child === 1 ? 10 : 20, groupStatus: child === 1 ? 'completed' : 'in_progress', dependsOnStageId: null, dependencyAnchor: null, durationDays: null, sortOrder: id });
    events.push({ id, projectId: '31', stageId: id, title: `План ${id}`, eventKind: 'duration', planStartDate: '2026-08-01', planEndDate: '2026-12-15', factStartDate: '2026-08-05', factEndDate: '2026-08-10', sortOrder: id });
  }
}
const pause = (page) => page.waitForTimeout(150);
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const nested of [false, true]) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('**/project-reports/**', async (route) => {
        const path = new URL(route.request().url()).pathname;
        const data = path.endsWith('/stages') ? stages : path.endsWith('/events') ? events : [];
        await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify(data) });
      });
      await page.goto(`http://127.0.0.1:4179/tests/gantt-planning.html${nested ? '?nested=1' : ''}`);
      await page.locator('[data-gantt-plan-event]').first().waitFor({ state: 'attached', timeout: 20000 });
      const track = page.locator('[data-autonomous-gantt-track="true"]').first();
      const board = track.locator('..');
      const viewport = board.locator('..');
      const pane = page.locator('#scrollport');
      const sticky = page.getByTestId('gantt-sticky-scale');
      assert.equal(await page.locator('[class*="ganttAutonomousEventFact"]').count(), 0);
      if (nested) {
        const offset = await board.evaluate((el) => el.getBoundingClientRect().top - document.getElementById('scrollport').getBoundingClientRect().top + document.getElementById('scrollport').scrollTop);
        await pane.evaluate((el, value) => { el.scrollTop = value + 350; }, offset);
      } else {
        const offset = await board.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
        await page.evaluate((value) => window.scrollTo(0, value + 350), offset);
      }
      await sticky.waitFor({ state: 'visible', timeout: 5000 });
      await pause(page);
      await page.screenshot({path: `tests/gantt-browser-artifacts/${nested ? 'nested' : 'window'}-sticky.png`});
      const expectedTop = nested ? (await pane.boundingBox()).y : 0;
      assert.ok(Math.abs((await sticky.boundingBox()).y - expectedTop) < 2, 'Header must pin at actual scrollport top');
      await viewport.evaluate((el) => { el.scrollLeft = 160; });
      await pause(page);
      const originalLeft = await board.evaluate((el) => el.children[1].getBoundingClientRect().left);
      const copyLeft = await page.getByTestId('gantt-sticky-dates').evaluate((el) => el.getBoundingClientRect().left);
      assert.ok(Math.abs(originalLeft - copyLeft) < 2, 'Horizontal date-scale alignment must remain exact');
      await page.setViewportSize({ width: 1100, height: 900 });
      await pause(page);
      const actual = await board.evaluate((el) => ({ left: el.children[1].getBoundingClientRect().left, width: el.children[1].getBoundingClientRect().width }));
      const copy = await page.getByTestId('gantt-sticky-dates').evaluate((el) => ({ left: el.getBoundingClientRect().left, width: el.getBoundingClientRect().width }));
      assert.ok(Math.abs(actual.left - copy.left) < 2 && Math.abs(actual.width - copy.width) < 2, 'Calendar must remain aligned on resize');
      if (nested) {
        const target = await board.evaluate((el) => el.getBoundingClientRect().bottom - document.getElementById('scrollport').getBoundingClientRect().top + document.getElementById('scrollport').scrollTop + 60);
        await pane.evaluate((el, value) => { el.scrollTop = value; }, target);
      } else {
        const target = await board.evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY + 60);
        await page.evaluate((value) => window.scrollTo(0, value), target);
      }
      await pause(page);
      assert.equal(await sticky.count(), 0, 'Header must disappear after the Gantt');
      assert.deepEqual(errors, [], 'No browser runtime errors');
      console.log('CHROMIUM_GANTT_CHECK_PASSED', nested ? 'nested scroll container' : 'window scrolling');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
