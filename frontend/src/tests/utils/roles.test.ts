import { describe, it, expect } from 'vitest';
import { computeValidRoles, APP_ROLE } from '../../lib/roles';

describe('computeValidRoles', () => {
  it('should allow tenant only', () => {
    expect(computeValidRoles(APP_ROLE.TENANT, [])).toEqual(['tenant']);
  });

  it('should add landlord and remove property_manager', () => {
    const current = ['tenant', 'property_manager'];
    const result = computeValidRoles(APP_ROLE.LANDLORD, current);
    expect(result).toContain('tenant');
    expect(result).toContain('landlord');
    expect(result).not.toContain('property_manager');
  });

  it('should add property_manager and remove landlord', () => {
    const current = ['tenant', 'landlord'];
    const result = computeValidRoles(APP_ROLE.PROPERTY_MANAGER, current);
    expect(result).toContain('tenant');
    expect(result).toContain('property_manager');
    expect(result).not.toContain('landlord');
  });

  it('should keep tenant when upgrading to landlord from pure tenant', () => {
    const current = ['tenant'];
    const result = computeValidRoles(APP_ROLE.LANDLORD, current);
    expect(result).toEqual(expect.arrayContaining(['tenant', 'landlord']));
  });
});
