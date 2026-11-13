import { test, expect } from '@playwright/test';

test('alur inti: catat trade → muncul di jurnal → cadangan', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pelita' })).toBeVisible();

  // catat trade closed lewat tombol tengah
  await page.getByRole('button', { name: 'Catat trade' }).first().click();
  await page.getByLabel('Entry').fill('2700');
  await page.getByLabel('Lot').fill('0.1');
  await page.getByRole('button', { name: 'Sudah ditutup' }).click();
  await page.getByLabel('Harga exit').fill('2710');
  await expect(page.getByText('+$100')).toBeVisible();
  await page.getByRole('button', { name: 'Simpan' }).click();

  // performa memuat P&L
  await expect(page.getByText('+$100').first()).toBeVisible();

  // jurnal berisi trade
  await page.getByRole('button', { name: 'My Journal' }).click();
  await page.getByRole('button', { name: /Tahun/ }).click();
  await page.getByRole('button', { name: /Okt|Nov|Des|Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep/ }).first().click();
  await expect(page.getByText('XAUUSD').first()).toBeVisible();

  // data bertahan setelah muat ulang
  await page.reload();
  await page.getByRole('button', { name: 'Performance' }).click();
  await expect(page.getByText('+$100').first()).toBeVisible();
});

test('mode gelap tersimpan', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tools' }).click();
  await page.getByRole('button', { name: /Mode tampilan/ }).click();
  await page.getByRole('button', { name: 'Gelap' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
});
