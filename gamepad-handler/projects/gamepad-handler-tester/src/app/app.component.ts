import { Component } from '@angular/core';
import { GamepadHandlerService } from 'gamepad-handler';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'gamepad-handler-tester';
  constructor(private ghs: GamepadHandlerService) {}
}
