// Mobile-first gate. Usage: node check.cjs <url|file> [more...]
// Fails (exit 1) on: horizontal scroll, missing viewport meta, text cut at the screen edge, media less than 80% visible.
// Decor past the edge (no text, aria-hidden, empty alt) and fully off-canvas elements only warn.
// Warns on: text < 12px, tap targets < 44px, 100vh without dvh/svh fallback.
let pw;
try { pw = require('playwright'); } catch (e) {
  try { pw = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); } catch (e2) {
    console.error('playwright missing. Install once: npm i -g playwright && npx playwright install --with-deps chromium');
    process.exit(2);
  }
}
const { chromium, devices } = pw;
const VPS = [
  ['android-360', { viewport: { width: 360, height: 780 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: devices['Pixel 7'].userAgent }],
  ['iphone-se-375', { viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: devices['iPhone 14'].userAgent }],
  ['iphone-390', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: devices['iPhone 14'].userAgent }],
  ['iphone-max-430', { viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: devices['iPhone 14'].userAgent }],
  ['landscape-844', { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: devices['iPhone 14'].userAgent }],
  ['tablet-768', { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true }],
  ['laptop-1366', { viewport: { width: 1366, height: 768 } }],
  ['desktop-1920', { viewport: { width: 1920, height: 1080 } }],
];
const shotDir = process.env.SHOTS || require('os').tmpdir();
(async () => {
  const targets = process.argv.slice(2).map(t => /^https?:|^file:/.test(t) ? t : 'file://' + require('path').resolve(t));
  if (!targets.length) { console.error('usage: node check.cjs <url|file>...'); process.exit(2); }
  const b = await chromium.launch();
  let fail = 0;
  for (const url of targets) {
    for (const [name, opts] of VPS) {
      const ctx = await b.newContext(opts); const p = await ctx.newPage();
      try {
        await p.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
        await p.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); });
        await p.waitForTimeout(400);
        const m = await p.evaluate(() => {
          const de = document.documentElement, vw = de.clientWidth;
          const sw = Math.max(de.scrollWidth, document.body ? document.body.scrollWidth : 0);
          scrollTo(100000, 0); const sx = Math.max(scrollX, de.scrollLeft, document.body ? document.body.scrollLeft : 0); scrollTo(0, 0);
          const meta = document.querySelector('meta[name=viewport]')?.content || '';
          const out = [], tiny = [], taps = [];
          const clippedByAncestor = el => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a); if (/(hidden|clip|auto|scroll)/.test(s.overflowX)) { const r = a.getBoundingClientRect(); if (r.left >= -1 && r.right <= vw + 1) return true; } } return false; };
          const decor = []; const ariaHidden = el => !!el.closest('[aria-hidden="true"],[role="presentation"],[role="none"]');
          const hasText = el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
          const isMedia = el => /^(IMG|VIDEO|PICTURE|CANVAS|IFRAME)$/.test(el.tagName);
          for (const el of document.querySelectorAll('body *')) {
            const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
            const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
            const label = el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '');
            if ((r.right > vw + 2 || r.left < -2) && !clippedByAncestor(el)) {
              const visible = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)) / r.width;
              const where = `${label} [${Math.round(r.left)}..${Math.round(r.right)}]`;
              if (visible === 0) { /* fully off-canvas (closed drawer, slide-in start): not a defect */ }
              else if (hasText(el) && !ariaHidden(el)) { if (out.length < 6) out.push('text cut: ' + where); }
              else if (isMedia(el) && !ariaHidden(el) && el.getAttribute('alt') !== '' && visible < 0.8) { if (out.length < 6) out.push(`media ${Math.round(visible * 100)}% visible: ` + where); }
              else if (decor.length < 4) decor.push(where);
            }
            if (hasText(el) && parseFloat(cs.fontSize) < 12 && tiny.length < 4) tiny.push(`${label} ${cs.fontSize}`);
            if (matchMedia('(pointer: coarse)').matches && r.right > 0 && r.left < vw && /^(A|BUTTON|INPUT|SELECT)$/.test(el.tagName) && (r.height < 44 || r.width < 44) && taps.length < 4) taps.push(`${label} ${Math.round(r.width)}x${Math.round(r.height)}`);
          }
          let vh = false, dvh = false;
          for (const s of document.styleSheets) { try { for (const r of s.cssRules) { if (/\b100vh\b/.test(r.cssText)) vh = true; if (/\d(dvh|svh|lvh)\b/.test(r.cssText)) dvh = true; } } catch (e) {} }
          return { vw, sw, sx, iw: innerWidth, meta, out, decor, tiny, taps, vhOnly: vh && !dvh };
        });
        const errs = [];
        if (m.sx > 1 || m.iw > m.vw + 1) errs.push(`HORIZONTAL SCROLL: page is ${Math.max(m.iw, m.vw + m.sx)}px wide on a ${m.vw}px screen (phone zooms out or pans sideways)`);
        if (!/width=device-width/.test(m.meta)) errs.push('viewport meta missing');
        if (m.out.length) errs.push('content outside screen: ' + m.out.join(', '));
        const warns = [];
        if (m.decor.length) warns.push('decor past edge (no scroll, ok if intended): ' + m.decor.join(', '));
        if (m.tiny.length) warns.push('text<12px: ' + m.tiny.join(', '));
        if (m.taps.length) warns.push('tap<44px: ' + m.taps.join(', '));
        if (m.vhOnly) warns.push('100vh without dvh/svh (iOS/Android address bar jump)');
        if (errs.length) fail++;
        console.log(`${errs.length ? 'FAIL' : 'PASS'} ${name.padEnd(15)} ${url}`);
        errs.forEach(e => console.log('   ✗ ' + e)); warns.forEach(w => console.log('   ! ' + w));
        const slug = url.replace(/^[a-z]+:\/\//, '').replace(/[^a-z0-9]+/gi, '-').slice(-40);
        await p.screenshot({ path: `${shotDir}/${slug}-${name}.jpg`, type: 'jpeg', quality: 50 });
      } catch (e) { fail++; console.log(`FAIL ${name} ${url}\n   ✗ ${e.message.split('\n')[0]}`); }
      await ctx.close();
    }
  }
  await b.close();
  console.log(fail ? `\n${fail} viewport(s) FAIL` : '\nALL PASS');
  console.log(`screenshots: ${shotDir}`);
  process.exit(fail ? 1 : 0);
})();
