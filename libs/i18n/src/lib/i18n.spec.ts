import { appCopy, localeNames } from './i18n';

describe('i18n', () => {
  it('contains the initial safety promise copy', () => {
    expect(localeNames.en).toEqual('English');
    expect(appCopy.promise).toContain('open today');
  });
});
