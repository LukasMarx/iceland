import { appCopy, localeNames } from './locale';

describe('domain — locale', () => {
  it('contains the initial safety promise copy', () => {
    expect(localeNames.en).toEqual('English');
    expect(appCopy.promise).toContain('open today');
  });
});
