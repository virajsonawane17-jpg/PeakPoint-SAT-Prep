// Run against a local static server: NODE_PATH=<playwright modules> node tests/browser.cjs
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.PEAKPOINT_TEST_URL || 'http://127.0.0.1:8765';
(async () => {
 const browser = await chromium.launch({headless:true, ...(process.env.PEAKPOINT_CHROME ? {executablePath:process.env.PEAKPOINT_CHROME} : {})});
 const page = await browser.newPage(); const errors=[]; page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/index.html'); await page.waitForFunction(()=>!document.getElementById('preview-check').disabled);
 await page.locator('input[name="preview-answer"]').first().check();await page.locator('#preview-check').click();assert.ok((await page.locator('#preview-feedback').innerText()).length>30);
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/index.html');await page.locator('.mobile-toggle').click();assert.equal(await page.locator('.mobile-toggle').getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await page.locator('.mobile-toggle').getAttribute('aria-expanded'),'false');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 for(const file of ['about.html','join.html','privacy.html','terms.html','contact.html','account-deletion.html','accessibility.html','reset-password.html']){await page.goto(base+'/'+file);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}
 // Fake identity only for local integration testing; production accounts are untouched.
 await page.route('**/auth.js',route=>route.fulfill({contentType:'application/javascript',body:`PP.auth={requireAuth:async()=>({id:localStorage.getItem('test-user')||'test-a',name:'Test Student'}),currentUser:async()=>null,loadData:async()=>({attempts:[],sessions:[],snapshots:[],profile:{}})};`}));
 await page.goto(base+'/question-list.html?skill=ha');await page.locator('[data-open]').first().waitFor();await page.locator('[data-open]').first().click();await page.locator('#practice-save').click();await page.locator('#practice-choices .choice').first().click();await page.locator('#practice-check').click();await page.locator('#practice-explanation').waitFor({state:'visible'});
 assert.equal(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('pp_qbank_progress:test-a'))).length),1);
 await page.goto(base+'/saved.html');await page.waitForFunction(()=>document.getElementById('review-status').textContent.includes('1 saved'));assert.equal(await page.locator('#review-records article').count(),1);
 await page.goto(base+'/analytics.html');await page.waitForFunction(()=>document.getElementById('metric-attempted').textContent==='1');assert.equal(await page.locator('#score-total').innerText(),'Not set');assert.equal(await page.locator('#metric-saved').innerText(),'1');
 await page.evaluate(()=>localStorage.setItem('test-user','test-b'));await page.goto(base+'/saved.html');await page.waitForFunction(()=>document.getElementById('review-status').textContent.startsWith('No saved'));assert.equal(await page.locator('#review-records article').count(),0);
 await page.goto(base+'/analytics.html');await page.waitForFunction(()=>document.getElementById('metric-attempted').textContent==='0');assert.equal(await page.locator('#score-total').innerText(),'Not set');
 assert.deepEqual(errors,[]);console.log('PASS: interactive preview, mobile navigation, public-page overflow, answer/save persistence, review records, analytics and account switching; no page errors.');await browser.close();
})().catch(error=>{console.error(error);process.exitCode=1});
