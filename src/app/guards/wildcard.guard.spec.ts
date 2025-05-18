import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { wildcardGuard } from './wildcard.guard';

describe('wildcardGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => wildcardGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
