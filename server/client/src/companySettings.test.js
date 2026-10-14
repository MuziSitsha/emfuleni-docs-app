jest.mock('./api', () => ({ get: jest.fn(), put: jest.fn() }));
import { bankingLines, bankingMarkup, DEFAULT_BANKING_DETAILS } from './bankingDetails';

test('includes all banking fields and preserves account numbers as text', () => {
  expect(bankingLines(DEFAULT_BANKING_DETAILS)).toEqual([
    'Bank: FNB', 'Branch Code: 261550', 'Account Number: 63196314074', 'Account Type: Gold Business Account',
  ]);
  expect(bankingLines({...DEFAULT_BANKING_DETAILS, accountNumber: '00123456'})[2]).toBe('Account Number: 00123456');
});
test('escapes banking details in print markup', () => {
  const markup = bankingMarkup({...DEFAULT_BANKING_DETAILS, bank: '<script>bad</script>'});
  expect(markup).toContain('&lt;script&gt;bad&lt;/script&gt;');
  expect(markup).not.toContain('<script>');
});
