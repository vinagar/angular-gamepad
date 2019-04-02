import { TestBed } from '@angular/core/testing';

import { GamepadHandlerService } from './gamepad-handler.service';

describe('GamepadHandlerService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: GamepadHandlerService = TestBed.get(GamepadHandlerService);
    expect(service).toBeTruthy();
  });
});
