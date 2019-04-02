import { inject, TestBed } from '@angular/core/testing';
import { GamepadHandlerService } from './gamepad-handler.service';

xdescribe('GamepadHandlerService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GamepadHandlerService]
    });
  });

  it('should be created', inject([GamepadHandlerService], (service: GamepadHandlerService) => {
    expect(service).toBeTruthy();
  }));
});
