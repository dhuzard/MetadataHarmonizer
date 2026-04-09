import {
  DEFAULT_GRID_ENGINE,
  normalizeGridEngine,
  resolveGridEngine,
} from '../lib/utils/gridEngine';

describe('grid engine utilities', () => {
  test('normalizeGridEngine falls back to handsontable for unknown values', () => {
    expect(normalizeGridEngine(undefined)).toBe(DEFAULT_GRID_ENGINE);
    expect(normalizeGridEngine('')).toBe(DEFAULT_GRID_ENGINE);
    expect(normalizeGridEngine('unknown')).toBe(DEFAULT_GRID_ENGINE);
  });

  test('normalizeGridEngine accepts supported values case-insensitively', () => {
    expect(normalizeGridEngine('handsontable')).toBe('handsontable');
    expect(normalizeGridEngine('Tabulator')).toBe('tabulator');
    expect(normalizeGridEngine('REVOGRID')).toBe('revogrid');
  });

  test('resolveGridEngine tracks requested and active engines separately', () => {
    expect(resolveGridEngine('handsontable')).toEqual({
      requested: 'handsontable',
      active: 'handsontable',
      implemented: true,
    });

    expect(resolveGridEngine('tabulator')).toEqual({
      requested: 'tabulator',
      active: 'handsontable',
      implemented: false,
    });

    expect(
      resolveGridEngine('revogrid', {
        templatePath: 'canada_covid19/CanCOGeNCovid19',
      })
    ).toEqual({
      requested: 'revogrid',
      active: 'revogrid',
      implemented: true,
    });

    expect(
      resolveGridEngine('revogrid', {
        templatePath: 'phac_dexa/PHACDexa',
      })
    ).toEqual({
      requested: 'revogrid',
      active: 'revogrid',
      implemented: true,
    });

    expect(
      resolveGridEngine('revogrid', {
        templatePath: 'grdi/GRDI',
      })
    ).toEqual({
      requested: 'revogrid',
      active: 'handsontable',
      implemented: false,
    });
  });
});
