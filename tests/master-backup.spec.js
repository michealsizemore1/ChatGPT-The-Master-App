const { test, expect } = require('@playwright/test');

// Verifies the "My Life Master App" full-suite backup (index.html) actually captures every app's
// IndexedDB storage -- not just localStorage and the two databases it originally knew about -- and
// that restoring that backup brings everything back, including the inline-keyPath stores (book
// covers, book documents, Bible images, other uploads, journal archive, retirement Document Vault)
// where a naive store.put(value, key) would throw a DataError.
test.describe('My Life Master App full-suite backup/restore', () => {
  test('backup captures every app IndexedDB store, and restore brings it all back', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/index.html', { waitUntil: 'load' });

    const ALL_DBS = [
      'my_life_command_center_large_storage', 'meridian_money_receipts', 'BibleImagesDB',
      'BookCoversDB', 'BookDocumentsDB', 'OtherUploadsDB', 'JournalArchiveDB',
      'retirementPlannerVaultDB_v1',
    ];

    async function wipeAll(p) {
      await p.evaluate(async (dbNames) => {
        localStorage.clear();
        for (const name of dbNames) {
          await new Promise((resolve) => {
            const r = indexedDB.deleteDatabase(name);
            r.onsuccess = resolve; r.onerror = resolve; r.onblocked = resolve;
          });
        }
      }, ALL_DBS);
    }

    await wipeAll(page);

    await page.evaluate(async () => {
      function openDb(name, storeName, storeOpts) {
        return new Promise((resolve, reject) => {
          const req = indexedDB.open(name, 1);
          req.onupgradeneeded = () => { req.result.createObjectStore(storeName, storeOpts); };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      }
      function putInline(db, storeName, value) {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          tx.objectStore(storeName).put(value);
          tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
        });
      }
      function putKeyed(db, storeName, key, value) {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          tx.objectStore(storeName).put(value, key);
          tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
        });
      }

      localStorage.setItem('meridian_money_data_v5', JSON.stringify({ accounts: [{ id: 'a1' }], transactions: [{ id: 't1', date: '2026-09-01' }] }));
      localStorage.setItem('retirementPlannerState_v1', JSON.stringify({ currentAge: 50 }));
      localStorage.setItem('planner_2026-09-01', JSON.stringify({ note: 'test day' }));

      const journalDb = await openDb('my_life_command_center_large_storage', 'journal', undefined);
      await putKeyed(journalDb, 'journal', 'entry1', 'hello journal');

      const receiptsDb = await openDb('meridian_money_receipts', 'receipts', undefined);
      await putKeyed(receiptsDb, 'receipts', 'r1', 'fake-receipt-data');

      const coversDb = await openDb('BookCoversDB', 'covers', { keyPath: 'bookId' });
      await putInline(coversDb, 'covers', { bookId: 'book1', img: 'cover-bytes' });

      const docsDb = await openDb('BookDocumentsDB', 'docs', { keyPath: 'id', autoIncrement: true });
      await putInline(docsDb, 'docs', { title: 'My Book', data: 'doc-bytes' });

      const imagesDb = await openDb('BibleImagesDB', 'images', { keyPath: 'id', autoIncrement: true });
      await putInline(imagesDb, 'images', { caption: 'verse art', data: 'img-bytes' });

      const filesDb = await openDb('OtherUploadsDB', 'files', { keyPath: 'id', autoIncrement: true });
      await putInline(filesDb, 'files', { name: 'upload.pdf', data: 'file-bytes' });

      const journalsDb = await openDb('JournalArchiveDB', 'journals', { keyPath: 'id', autoIncrement: true });
      await putInline(journalsDb, 'journals', { entry: 'archived entry' });

      const vaultDb = await openDb('retirementPlannerVaultDB_v1', 'documents', { keyPath: 'id' });
      await putInline(vaultDb, 'documents', { id: 'doc-1', name: 'Will.pdf', data: 'vault-bytes' });
    });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.evaluate(() => downloadMasterBackup()),
    ]);
    const backupPath = await download.path();
    const backup = JSON.parse(require('fs').readFileSync(backupPath, 'utf8'));

    expect(backup.format).toBe('my-life-master-app-backup');
    expect(backup.localStorage['meridian_money_data_v5']).toBeTruthy();
    expect(backup.localStorage['retirementPlannerState_v1']).toBeTruthy();
    expect(backup.localStorage['planner_2026-09-01']).toBeTruthy();

    const expectDb = (db, store) => {
      expect(backup.indexedDB[db], `missing ${db} in backup`).toBeTruthy();
      expect(backup.indexedDB[db][store], `missing ${db}/${store} in backup`).toBeTruthy();
      expect(Object.keys(backup.indexedDB[db][store]).length).toBeGreaterThan(0);
    };
    expectDb('my_life_command_center_large_storage', 'journal');
    expectDb('meridian_money_receipts', 'receipts');
    expectDb('BibleImagesDB', 'images');
    expectDb('BookCoversDB', 'covers');
    expectDb('BookDocumentsDB', 'docs');
    expectDb('OtherUploadsDB', 'files');
    expectDb('JournalArchiveDB', 'journals');
    expectDb('retirementPlannerVaultDB_v1', 'documents');

    // Wipe everything again and restore from that exact backup file. This is the real regression
    // test: the inline-keyPath stores (covers/docs/images/files/journals/documents) must come back
    // without throwing "the object store uses in-line keys and the key parameter was provided".
    await wipeAll(page);
    await page.reload({ waitUntil: 'load' });

    page.once('dialog', (d) => d.accept());
    await page.setInputFiles('#masterBackupFile', backupPath);
    await page.waitForFunction(() => {
      const el = document.getElementById('masterBackupStatus');
      return el && /restored/i.test(el.textContent || '');
    }, { timeout: 10000 });

    const result = await page.evaluate(async () => {
      function readAll(dbName, storeName) {
        return new Promise((resolve) => {
          const req = indexedDB.open(dbName);
          req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(storeName)) { resolve([]); return; }
            const tx = db.transaction(storeName, 'readonly');
            const out = [];
            const cur = tx.objectStore(storeName).openCursor();
            cur.onsuccess = () => { const c = cur.result; if (c) { out.push(c.value); c.continue(); } else resolve(out); };
            cur.onerror = () => resolve([]);
          };
          req.onerror = () => resolve([]);
        });
      }
      return {
        meridian: localStorage.getItem('meridian_money_data_v5'),
        retirement: localStorage.getItem('retirementPlannerState_v1'),
        planner: localStorage.getItem('planner_2026-09-01'),
        covers: await readAll('BookCoversDB', 'covers'),
        docs: await readAll('BookDocumentsDB', 'docs'),
        images: await readAll('BibleImagesDB', 'images'),
        files: await readAll('OtherUploadsDB', 'files'),
        journals: await readAll('JournalArchiveDB', 'journals'),
        vault: await readAll('retirementPlannerVaultDB_v1', 'documents'),
        journal: await readAll('my_life_command_center_large_storage', 'journal'),
        receipts: await readAll('meridian_money_receipts', 'receipts'),
      };
    });

    expect(result.meridian).toBeTruthy();
    expect(result.retirement).toBeTruthy();
    expect(result.planner).toBeTruthy();
    expect(result.covers.length).toBe(1);
    expect(result.covers[0].bookId).toBe('book1');
    expect(result.docs.length).toBe(1);
    expect(result.images.length).toBe(1);
    expect(result.files.length).toBe(1);
    expect(result.journals.length).toBe(1);
    expect(result.vault.length).toBe(1);
    expect(result.vault[0].id).toBe('doc-1');
    expect(result.journal.length).toBe(1);
    expect(result.receipts.length).toBe(1);

    expect(errors).toEqual([]);
  });

  test('an old-format backup (without the newer IndexedDB sources) still restores cleanly', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/index.html', { waitUntil: 'load' });
    await page.evaluate(() => localStorage.clear());

    const oldBackup = {
      format: 'my-life-master-app-backup',
      version: 2,
      createdAt: '2026-07-27T00:00:00.000Z',
      origin: 'https://example.test',
      itemCount: 1,
      localStorage: { meridian_money_data_v5: JSON.stringify({ accounts: [], transactions: [] }) },
      indexedDB: {
        my_life_command_center_large_storage: { journal: { e1: 'old journal entry' } },
      },
    };
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const tmpFile = path.join(os.tmpdir(), 'old-format-backup.json');
    fs.writeFileSync(tmpFile, JSON.stringify(oldBackup));

    page.once('dialog', (d) => d.accept());
    await page.setInputFiles('#masterBackupFile', tmpFile);
    await page.waitForFunction(() => {
      const el = document.getElementById('masterBackupStatus');
      return el && /restored/i.test(el.textContent || '');
    }, { timeout: 10000 });

    const restored = await page.evaluate(() => localStorage.getItem('meridian_money_data_v5'));
    expect(restored).toBeTruthy();
    expect(errors).toEqual([]);
  });
});
