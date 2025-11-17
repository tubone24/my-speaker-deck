import { describe, it, expect } from 'vitest';
import { getShareUrl, platformConfig } from './share';

describe('getShareUrl', () => {
  const testUrl = 'https://example.com';
  const testText = 'Test text';
  const testTitle = 'Test title';

  it('should generate correct Twitter share URL', () => {
    const url = getShareUrl('twitter', testUrl, testText);
    expect(url).toContain('https://twitter.com/intent/tweet');
    expect(url).toContain(encodeURIComponent(testUrl));
    expect(url).toContain(encodeURIComponent(testText));
  });

  it('should generate correct Facebook share URL', () => {
    const url = getShareUrl('facebook', testUrl);
    expect(url).toContain('https://www.facebook.com/sharer/sharer.php');
    expect(url).toContain(encodeURIComponent(testUrl));
  });

  it('should generate correct LINE share URL', () => {
    const url = getShareUrl('line', testUrl);
    expect(url).toContain('https://social-plugins.line.me/lineit/share');
    expect(url).toContain(encodeURIComponent(testUrl));
  });

  it('should generate correct LinkedIn share URL', () => {
    const url = getShareUrl('linkedin', testUrl);
    expect(url).toContain('https://www.linkedin.com/sharing/share-offsite/');
    expect(url).toContain(encodeURIComponent(testUrl));
  });

  it('should generate correct Pinterest share URL', () => {
    const url = getShareUrl('pinterest', testUrl, testText);
    expect(url).toContain('https://pinterest.com/pin/create/button/');
    expect(url).toContain(encodeURIComponent(testUrl));
    expect(url).toContain(encodeURIComponent(testText));
  });

  it('should generate correct Hatena share URL', () => {
    const url = getShareUrl('hatena', testUrl, '', testTitle);
    expect(url).toContain('https://b.hatena.ne.jp/add');
    expect(url).toContain(encodeURIComponent(testUrl));
    expect(url).toContain(encodeURIComponent(testTitle));
  });

  it('should properly encode special characters in URLs', () => {
    const specialUrl = 'https://example.com/?param=value&other=123';
    const url = getShareUrl('twitter', specialUrl);
    expect(url).toContain(encodeURIComponent(specialUrl));
  });

  it('should handle empty text parameter', () => {
    const url = getShareUrl('twitter', testUrl);
    expect(url).toBeTruthy();
    expect(url).toContain(encodeURIComponent(testUrl));
  });
});

describe('platformConfig', () => {
  it('should have configuration for all platforms', () => {
    expect(platformConfig.twitter).toBeDefined();
    expect(platformConfig.facebook).toBeDefined();
    expect(platformConfig.line).toBeDefined();
    expect(platformConfig.linkedin).toBeDefined();
    expect(platformConfig.pinterest).toBeDefined();
    expect(platformConfig.hatena).toBeDefined();
  });

  it('should have required properties for each platform', () => {
    Object.values(platformConfig).forEach((config) => {
      expect(config).toHaveProperty('icon');
      expect(config).toHaveProperty('color');
      expect(config).toHaveProperty('label');
      expect(typeof config.icon).toBe('string');
      expect(typeof config.color).toBe('string');
      expect(typeof config.label).toBe('string');
    });
  });

  it('should have valid color codes', () => {
    Object.values(platformConfig).forEach((config) => {
      expect(config.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});
