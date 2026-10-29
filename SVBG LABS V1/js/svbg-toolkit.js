/* ==========================================================================
   SVBG CYBERSECURITY TOOLKIT — additive module extending the existing
   Vault Tools view (app.js) with more offline utilities: AES encrypt/
   decrypt, MD5, UUID generator, color picker, JSON formatter, regex
   tester, URL encode/decode, text diff, and file checksum. Every tool
   runs entirely client-side; nothing is uploaded anywhere.

   Wraps Views.vault / ViewMount.vault the same way svbg-advanced.js
   wraps Views.pomodoro for Focus Environment — original tabs/panels are
   untouched, new ones are appended using the same .tool-tabs/.tool-panel
   markup and the existing generic tab-switch handler already in
   ViewMount.vault (it queries ALL .tool-tab elements, so newly added
   tabs work without touching that handler).
   ========================================================================== */
'use strict';

(function () {
  /* ---------------------------------------------------------------------- *
   * MD5 — Web Crypto doesn't expose MD5 (deprecated for security reasons,
   * but still asked for here as a general-purpose hash/checksum option).
   * Implemented directly from the RFC 1321 specification and verified
   * against the RFC's own test vectors.
   * ---------------------------------------------------------------------- */
  function md5(str) {
    function rotl(x, c) { return (x << c) | (x >>> (32 - c)); }
    const K = new Array(64);
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
    const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
               5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
               4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
               6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
    const utf8 = unescape(encodeURIComponent(str));
    const bytes = [];
    for (let i = 0; i < utf8.length; i++) bytes.push(utf8.charCodeAt(i));
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 0; i < 8; i++) bytes.push((bitLen / Math.pow(2, 8 * i)) & 0xff);
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (let chunkStart = 0; chunkStart < bytes.length; chunkStart += 64) {
      const M = new Array(16);
      for (let i = 0; i < 16; i++) M[i] = bytes[chunkStart+i*4] | (bytes[chunkStart+i*4+1]<<8) | (bytes[chunkStart+i*4+2]<<16) | (bytes[chunkStart+i*4+3]<<24);
      let A=a0,B=b0,C=c0,D=d0;
      for (let i = 0; i < 64; i++) {
        let F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5*i+1) % 16; }
        else if (i < 48) { F = B ^ C ^ D; g = (3*i+5) % 16; }
        else { F = C ^ (B | ~D); g = (7*i) % 16; }
        F = (F + A + K[i] + M[g]) | 0;
        A = D; D = C; C = B;
        B = (B + rotl(F, S[i])) | 0;
      }
      a0 = (a0+A)|0; b0 = (b0+B)|0; c0 = (c0+C)|0; d0 = (d0+D)|0;
    }
    const hex = n => { n = n>>>0; let h=''; for (let i=0;i<4;i++) h += ((n>>>(i*8))&0xff).toString(16).padStart(2,'0'); return h; };
    return hex(a0)+hex(b0)+hex(c0)+hex(d0);
  }
  async function md5File(arrayBuffer) {
    // same algorithm, operating directly on the file's bytes (no UTF-8 step)
    const bytes = Array.from(new Uint8Array(arrayBuffer));
    const str = bytes.map(b => String.fromCharCode(b)).join('');
    // reuse md5() but bypass its UTF-8 re-encoding by feeding already-raw bytes
    // through the same core loop:
    return md5RawBytes(bytes);
  }
  function md5RawBytes(bytes) {
    bytes = bytes.slice();
    function rotl(x, c) { return (x << c) | (x >>> (32 - c)); }
    const K = new Array(64);
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
    const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
               5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
               4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
               6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 0; i < 8; i++) bytes.push((bitLen / Math.pow(2, 8 * i)) & 0xff);
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (let chunkStart = 0; chunkStart < bytes.length; chunkStart += 64) {
      const M = new Array(16);
      for (let i = 0; i < 16; i++) M[i] = bytes[chunkStart+i*4] | (bytes[chunkStart+i*4+1]<<8) | (bytes[chunkStart+i*4+2]<<16) | (bytes[chunkStart+i*4+3]<<24);
      let A=a0,B=b0,C=c0,D=d0;
      for (let i = 0; i < 64; i++) {
        let F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5*i+1) % 16; }
        else if (i < 48) { F = B ^ C ^ D; g = (3*i+5) % 16; }
        else { F = C ^ (B | ~D); g = (7*i) % 16; }
        F = (F + A + K[i] + M[g]) | 0;
        A = D; D = C; C = B;
        B = (B + rotl(F, S[i])) | 0;
      }
      a0 = (a0+A)|0; b0 = (b0+B)|0; c0 = (c0+C)|0; d0 = (d0+D)|0;
    }
    const hex = n => { n = n>>>0; let h=''; for (let i=0;i<4;i++) h += ((n>>>(i*8))&0xff).toString(16).padStart(2,'0'); return h; };
    return hex(a0)+hex(b0)+hex(c0)+hex(d0);
  }

  /* ---------------------------------------------------------------------- *
   * AES-GCM (password-based) — real Web Crypto, PBKDF2-derived key.
   * Output blob = base64(salt(16) + iv(12) + ciphertext) so the person
   * doesn't have to track salt/iv separately.
   * ---------------------------------------------------------------------- */
  async function deriveAesKey(password, salt) {
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
      baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
  }
  function bufToB64(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))); }
  function b64ToBuf(b64) { const bin = atob(b64); const arr = new Uint8Array(bin.length); for (let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); return arr; }
  async function aesEncrypt(plaintext, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveAesKey(password, salt);
    const enc = new TextEncoder();
    const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
    const combined = new Uint8Array(salt.length + iv.length + cipherBuf.byteLength);
    combined.set(salt, 0); combined.set(iv, salt.length); combined.set(new Uint8Array(cipherBuf), salt.length + iv.length);
    return bufToB64(combined.buffer);
  }
  async function aesDecrypt(blobB64, password) {
    const combined = b64ToBuf(blobB64);
    const salt = combined.slice(0, 16), iv = combined.slice(16, 28), cipher = combined.slice(28);
    const key = await deriveAesKey(password, salt);
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    return new TextDecoder().decode(plainBuf);
  }

  /* ---------------------------------------------------------------------- *
   * Line diff — classic LCS dynamic-programming line diff.
   * ---------------------------------------------------------------------- */
  function lineDiff(a, b) {
    const la = a.split('\n'), lb = b.split('\n');
    const n = la.length, m = lb.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = la[i] === lb[j] ? dp[i+1][j+1] + 1 : Math.max(dp[i+1][j], dp[i][j+1]);
    const out = []; let i = 0, j = 0;
    while (i < n && j < m) {
      if (la[i] === lb[j]) { out.push({ type: 'same', text: la[i] }); i++; j++; }
      else if (dp[i+1][j] >= dp[i][j+1]) { out.push({ type: 'del', text: la[i] }); i++; }
      else { out.push({ type: 'add', text: lb[j] }); j++; }
    }
    while (i < n) { out.push({ type: 'del', text: la[i] }); i++; }
    while (j < m) { out.push({ type: 'add', text: lb[j] }); j++; }
    return out;
  }

  /* ---------------------------------------------------------------------- *
   * VIEW EXTENSION
   * ---------------------------------------------------------------------- */
  const TOOLKIT_TABS = ['aes', 'md5', 'uuid', 'color', 'json', 'regex', 'urlenc', 'diff', 'checksum'];
  const originalVaultView = Views.vault;
  const originalVaultMount = ViewMount.vault;

  Views.vault = function () {
    const extraTabs = `
      <button class="tool-tab btn ${VaultState.tab==='aes'?'is-active':''}" data-tab="aes">AES encrypt/decrypt</button>
      <button class="tool-tab btn ${VaultState.tab==='md5'?'is-active':''}" data-tab="md5">MD5</button>
      <button class="tool-tab btn ${VaultState.tab==='uuid'?'is-active':''}" data-tab="uuid">UUID</button>
      <button class="tool-tab btn ${VaultState.tab==='color'?'is-active':''}" data-tab="color">Color picker</button>
      <button class="tool-tab btn ${VaultState.tab==='json'?'is-active':''}" data-tab="json">JSON formatter</button>
      <button class="tool-tab btn ${VaultState.tab==='regex'?'is-active':''}" data-tab="regex">Regex tester</button>
      <button class="tool-tab btn ${VaultState.tab==='urlenc'?'is-active':''}" data-tab="urlenc">URL encode/decode</button>
      <button class="tool-tab btn ${VaultState.tab==='diff'?'is-active':''}" data-tab="diff">Text diff</button>
      <button class="tool-tab btn ${VaultState.tab==='checksum'?'is-active':''}" data-tab="checksum">File checksum</button>
    `;
    const extraPanels = `
      <div class="card tool-panel ${VaultState.tab==='aes'?'is-active':''}" data-panel="aes">
        <div class="field"><label>Text</label><textarea id="aes-text" rows="4" placeholder="Text to encrypt, or a blob to decrypt..."></textarea></div>
        <div class="field"><label>Password</label><input type="password" id="aes-pass" placeholder="Passphrase" /></div>
        <div style="display:flex;gap:10px;margin-bottom:14px;">
          <button class="btn btn-primary" id="aes-encrypt-btn">Encrypt &rarr;</button>
          <button class="btn btn-primary" id="aes-decrypt-btn">&larr; Decrypt</button>
        </div>
        <div class="mono-box" id="aes-output" style="word-break:break-all;">—</div>
        <p style="font-size:11.5px;color:var(--text-faint);margin-top:8px;">AES-256-GCM, key derived from your passphrase with PBKDF2 (150,000 iterations). The output blob bundles a random salt + IV, so decrypting only needs the blob and the same passphrase.</p>
      </div>

      <div class="card tool-panel ${VaultState.tab==='md5'?'is-active':''}" data-panel="md5">
        <div class="field"><label>Text to hash</label><textarea id="md5-input" rows="4" placeholder="Enter text..."></textarea></div>
        <button class="btn btn-primary" id="md5-generate" style="margin-bottom:14px;">Generate MD5</button>
        <div class="mono-box" id="md5-output">—</div>
        <p style="font-size:11.5px;color:var(--text-faint);margin-top:8px;">MD5 is fast but not collision-resistant — fine for checksums, not for passwords or security-sensitive hashing (use SHA-256 for that, in the Hash generator tab).</p>
      </div>

      <div class="card tool-panel ${VaultState.tab==='uuid'?'is-active':''}" data-panel="uuid">
        <button class="btn btn-primary" id="uuid-generate" style="margin-bottom:14px;">Generate UUID v4</button>
        <div class="mono-box" id="uuid-output" style="font-size:16px;">—</div>
        <div class="field" style="margin-top:14px;"><label>Batch size</label><input type="range" id="uuid-count" min="1" max="20" value="5" /></div>
        <div class="mono-box" id="uuid-batch-output" style="white-space:pre-line;font-size:12px;"></div>
      </div>

      <div class="card tool-panel ${VaultState.tab==='color'?'is-active':''}" data-panel="color">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          <input type="color" id="color-input" value="#59e7d9" style="width:64px;height:64px;border-radius:12px;border:1px solid var(--border);background:none;cursor:pointer;" />
          <div style="flex:1;min-width:200px;">
            <div class="mono-box" id="color-hex" style="margin-bottom:8px;">#59E7D9</div>
            <div class="mono-box" id="color-rgb" style="margin-bottom:8px;">rgb(89, 231, 217)</div>
            <div class="mono-box" id="color-hsl">hsl(174, 66%, 63%)</div>
          </div>
        </div>
      </div>

      <div class="card tool-panel ${VaultState.tab==='json'?'is-active':''}" data-panel="json">
        <div class="field"><label>JSON</label><textarea id="json-input" rows="8" placeholder='{"example": true, "items": [1,2,3]}'></textarea></div>
        <div style="display:flex;gap:10px;margin-bottom:10px;">
          <button class="btn btn-primary" id="json-format">Format</button>
          <button class="btn" id="json-minify">Minify</button>
        </div>
        <div id="json-error" style="color:var(--danger);font-size:12.5px;min-height:16px;"></div>
      </div>

      <div class="card tool-panel ${VaultState.tab==='regex'?'is-active':''}" data-panel="regex">
        <div class="grid grid-2" style="margin-bottom:12px;">
          <div class="field"><label>Pattern</label><input type="text" id="regex-pattern" placeholder="e.g. \\b[A-Z]\\w+\\b" /></div>
          <div class="field"><label>Flags</label><input type="text" id="regex-flags" placeholder="g, i, m..." value="g" /></div>
        </div>
        <div class="field"><label>Test string</label><textarea id="regex-test" rows="6" placeholder="Text to test the pattern against..."></textarea></div>
        <div id="regex-result" style="margin-top:10px;padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface);font-family:var(--font-mono);font-size:12.5px;white-space:pre-wrap;min-height:20px;"></div>
        <div id="regex-count" style="margin-top:8px;font-size:12px;color:var(--text-muted);"></div>
      </div>

      <div class="card tool-panel ${VaultState.tab==='urlenc'?'is-active':''}" data-panel="urlenc">
        <div class="grid grid-2">
          <div><label>Plain text / URL</label><textarea id="url-plain" rows="6" placeholder="Type text or a URL to encode..."></textarea></div>
          <div><label>Encoded</label><textarea id="url-encoded" rows="6" placeholder="Or paste an encoded string to decode..."></textarea></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:12px;">
          <button class="btn btn-primary" id="url-encode-btn">Encode &rarr;</button>
          <button class="btn btn-primary" id="url-decode-btn">&larr; Decode</button>
        </div>
      </div>

      <div class="card tool-panel ${VaultState.tab==='diff'?'is-active':''}" data-panel="diff">
        <div class="grid grid-2" style="margin-bottom:12px;">
          <div class="field"><label>Original</label><textarea id="diff-a" rows="8" placeholder="Original text..."></textarea></div>
          <div class="field"><label>Changed</label><textarea id="diff-b" rows="8" placeholder="Changed text..."></textarea></div>
        </div>
        <button class="btn btn-primary" id="diff-compare" style="margin-bottom:12px;">Compare</button>
        <div id="diff-output" class="mono-box" style="text-align:left;white-space:pre-wrap;"></div>
      </div>

      <div class="card tool-panel ${VaultState.tab==='checksum'?'is-active':''}" data-panel="checksum">
        <div class="field"><label>Choose a file</label><input type="file" id="checksum-file" /></div>
        <div id="checksum-output" style="margin-top:14px;display:none;">
          <div class="mono-box" style="margin-bottom:8px;"><b>SHA-256:</b> <span id="checksum-sha256"></span></div>
          <div class="mono-box" style="margin-bottom:8px;"><b>SHA-1:</b> <span id="checksum-sha1"></span></div>
          <div class="mono-box"><b>MD5:</b> <span id="checksum-md5"></span></div>
        </div>
        <p style="font-size:11.5px;color:var(--text-faint);margin-top:8px;">The file is read and hashed entirely in your browser — it's never uploaded anywhere.</p>
      </div>
    `;
    return originalVaultView()
      .replace(/(<\/div>\s*)(<div class="card tool-panel)/, `$1${extraTabs}$2`)
      .replace(/$/, extraPanels);
  };

  ViewMount.vault = function (root) {
    originalVaultMount(root);

    // AES
    root.querySelector('#aes-encrypt-btn')?.addEventListener('click', async () => {
      const text = root.querySelector('#aes-text').value, pass = root.querySelector('#aes-pass').value;
      const out = root.querySelector('#aes-output');
      if (!text || !pass) { out.textContent = 'Enter text and a passphrase first.'; return; }
      out.textContent = 'Encrypting…';
      try { out.textContent = await aesEncrypt(text, pass); } catch (e) { out.textContent = 'Encryption failed: ' + e.message; }
    });
    root.querySelector('#aes-decrypt-btn')?.addEventListener('click', async () => {
      const text = root.querySelector('#aes-text').value, pass = root.querySelector('#aes-pass').value;
      const out = root.querySelector('#aes-output');
      if (!text || !pass) { out.textContent = 'Paste an encrypted blob and its passphrase.'; return; }
      out.textContent = 'Decrypting…';
      try { out.textContent = await aesDecrypt(text.trim(), pass); }
      catch (e) { out.textContent = 'Decryption failed — wrong passphrase, or this isn\'t a blob this tool produced.'; }
    });

    // MD5
    root.querySelector('#md5-generate')?.addEventListener('click', () => {
      root.querySelector('#md5-output').textContent = md5(root.querySelector('#md5-input').value);
    });

    // UUID
    function genUuid() { return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); }); }
    root.querySelector('#uuid-generate')?.addEventListener('click', () => { root.querySelector('#uuid-output').textContent = genUuid(); });
    const uuidCount = root.querySelector('#uuid-count');
    if (uuidCount) uuidCount.addEventListener('input', () => {
      const n = parseInt(uuidCount.value, 10);
      root.querySelector('#uuid-batch-output').textContent = Array.from({ length: n }, genUuid).join('\n');
    });

    // Color picker
    const colorInput = root.querySelector('#color-input');
    function updateColor() {
      const hex = colorInput.value;
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
      root.querySelector('#color-hex').textContent = hex.toUpperCase();
      root.querySelector('#color-rgb').textContent = `rgb(${r}, ${g}, ${b})`;
      const r1=r/255,g1=g/255,b1=b/255, max=Math.max(r1,g1,b1), min=Math.min(r1,g1,b1);
      let h=0,s=0,l=(max+min)/2;
      if (max!==min) { const d=max-min; s=l>0.5?d/(2-max-min):d/(max+min);
        if (max===r1) h=((g1-b1)/d+(g1<b1?6:0)); else if (max===g1) h=(b1-r1)/d+2; else h=(r1-g1)/d+4;
        h*=60; }
      root.querySelector('#color-hsl').textContent = `hsl(${Math.round(h)}, ${Math.round(s*100)}%, ${Math.round(l*100)}%)`;
    }
    if (colorInput) { colorInput.addEventListener('input', updateColor); updateColor(); }

    // JSON formatter
    root.querySelector('#json-format')?.addEventListener('click', () => {
      const el = root.querySelector('#json-input'), err = root.querySelector('#json-error');
      try { el.value = JSON.stringify(JSON.parse(el.value), null, 2); err.textContent = ''; }
      catch (e) { err.textContent = 'Invalid JSON: ' + e.message; }
    });
    root.querySelector('#json-minify')?.addEventListener('click', () => {
      const el = root.querySelector('#json-input'), err = root.querySelector('#json-error');
      try { el.value = JSON.stringify(JSON.parse(el.value)); err.textContent = ''; }
      catch (e) { err.textContent = 'Invalid JSON: ' + e.message; }
    });

    // Regex tester
    function runRegex() {
      const pattern = root.querySelector('#regex-pattern').value;
      const flags = root.querySelector('#regex-flags').value;
      const text = root.querySelector('#regex-test').value;
      const resultEl = root.querySelector('#regex-result'), countEl = root.querySelector('#regex-count');
      if (!pattern) { resultEl.innerHTML = escapeHtml(text); countEl.textContent = ''; return; }
      let re;
      try { re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g'); }
      catch (e) { resultEl.textContent = ''; countEl.textContent = 'Invalid pattern: ' + e.message; return; }
      let lastIndex = 0, html = '', count = 0, m;
      re.lastIndex = 0;
      while ((m = re.exec(text)) !== null) {
        html += escapeHtml(text.slice(lastIndex, m.index));
        html += `<mark style="background:rgba(89,231,217,0.35);border-radius:3px;">${escapeHtml(m[0])}</mark>`;
        lastIndex = m.index + Math.max(m[0].length, 1);
        count++;
        if (m[0].length === 0) re.lastIndex++;
        if (count > 5000) break;
      }
      html += escapeHtml(text.slice(lastIndex));
      resultEl.innerHTML = html || '<span style="color:var(--text-faint);">No matches</span>';
      countEl.textContent = `${count} match${count === 1 ? '' : 'es'}`;
    }
    ['regex-pattern', 'regex-flags', 'regex-test'].forEach(id => root.querySelector('#' + id)?.addEventListener('input', runRegex));

    // URL encode/decode
    root.querySelector('#url-encode-btn')?.addEventListener('click', () => { root.querySelector('#url-encoded').value = encodeURIComponent(root.querySelector('#url-plain').value); });
    root.querySelector('#url-decode-btn')?.addEventListener('click', () => {
      try { root.querySelector('#url-plain').value = decodeURIComponent(root.querySelector('#url-encoded').value); }
      catch (e) { toast('Invalid encoded text'); }
    });

    // Text diff
    root.querySelector('#diff-compare')?.addEventListener('click', () => {
      const a = root.querySelector('#diff-a').value, b = root.querySelector('#diff-b').value;
      const rows = lineDiff(a, b);
      const colorFor = t => t === 'add' ? '#4ADE9A' : t === 'del' ? '#FB7185' : 'var(--text-muted)';
      const prefixFor = t => t === 'add' ? '+ ' : t === 'del' ? '- ' : '  ';
      root.querySelector('#diff-output').innerHTML = rows.map(r => `<div style="color:${colorFor(r.type)};">${escapeHtml(prefixFor(r.type) + r.text)}</div>`).join('');
    });

    // File checksum
    root.querySelector('#checksum-file')?.addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const out = root.querySelector('#checksum-output');
      out.style.display = 'block';
      ['checksum-sha256', 'checksum-sha1', 'checksum-md5'].forEach(id => root.querySelector('#' + id).textContent = 'Computing…');
      const buf = await file.arrayBuffer();
      const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buf))).map(b => b.toString(16).padStart(2, '0')).join('');
      const sha1 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', buf))).map(b => b.toString(16).padStart(2, '0')).join('');
      root.querySelector('#checksum-sha256').textContent = sha256;
      root.querySelector('#checksum-sha1').textContent = sha1;
      root.querySelector('#checksum-md5').textContent = await md5File(buf);
    });
  };
})();
