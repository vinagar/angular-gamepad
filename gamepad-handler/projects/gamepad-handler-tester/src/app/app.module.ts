import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { GamepadHandlerModule } from 'gamepad-handler';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, GamepadHandlerModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
