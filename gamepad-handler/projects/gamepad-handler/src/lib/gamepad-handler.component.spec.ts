import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GamepadHandlerComponent } from './gamepad-handler.component';

describe('GamepadHandlerComponent', () => {
  let component: GamepadHandlerComponent;
  let fixture: ComponentFixture<GamepadHandlerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GamepadHandlerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GamepadHandlerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
