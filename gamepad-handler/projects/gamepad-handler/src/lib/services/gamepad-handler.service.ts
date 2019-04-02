import { Injectable } from '@angular/core';
import { EventEmitter } from 'events';
import { GamepadButtons } from '../enums/gamepadButtons';
import { GamepadConstants } from '../enums/gamepadConstants';
import { GamepadHandlerEvent } from '../enums/gamepadHandlerEvent';

declare var window: any;

@Injectable()
export class GamepadHandlerService extends EventEmitter {
  /**
   * Decides whether next poll has to be scheduled or not.
   *
   * If true, and `startPolling()` is in progress,
   * then it continuosly polls for the gamepad status
   * using `window.requestAnimationFrame`.
   *
   * If false, then gamepad events will not be triggered
   * and gamepad status changed will not be watched for.
   */
  private pollInProgress = false;

  /**
   * The list of attached gamepads.
   * Differs from raw browser gamepad.
   */
  private gamepads: Array<Gamepad> = [];

  /**
   * Remembers the connected gamepads at the last check.
   * Used to identify when the gamepads are connected/disconnected
   */
  private readonly previousGamepadState: Array<boolean> = [];

  /**
   * Maintains the previous button state.
   * Used for emiting event when gamepad button is pressed or released.
   */
  private readonly previousButtonState: Array<Array<{ pressed: boolean; value: number }>> = [];

  /**
   * Maintains the previous axes state
   * Used for emiting event when gamepad axes/triggers is moved.
   */
  private readonly previousAxesState: Array<Array<number>> = [];

  /**
   * In browsers, if gamepad is already connected then
   * the user has to press any button for the browser to detect the gamepad.
   */
  private gamepadReady = false;

  /**
   * The number of iterations performed when stick is in deadzone.
   * This will be compared with ITERATIONS_TO_CONSIDER_AXES_MOVE_STOPPED to
   * declare whether stick MOVE_STOPPED event should be triggered or not
   */
  private readonly stopIterationCount: Array<number> = [];

  /**
   * Extends browser's gamepad API to emit events on any gamepad activity
   * @param autoInitialize Decides whether to startPolling as soon as an object is created.
   * Defaults to `true` so as to start polling automatically.
   * Initialize with false if you want to start polling at some time later.
   */
  constructor() {
    super();
  }

  // TODO: Add code so that user can decide whether to receive pressed events or not

  /**
   * Initialize support for Gamepad API and `startPolling` for any gamepad changes.
   */
  init(): void {
    const gamepadSupportAvailable =
      !!window.navigator.getGamepads || !!window.navigator.webkitGetGamepads || !!window.navigator.webkitGamepads;

    if (!gamepadSupportAvailable) {
      // Throw error if Gamepad API is not available
      throw new Error('Gamepad support is not available');
    }

    // start polling
    this.startPolling();
  }

  /**
   * Starts a polling loop to check for gamepad state.
   */
  private startPolling(): void {
    if (!this.pollInProgress) {
      this.pollInProgress = true;
      this.tick();
    }
  }

  /**
   * Stops polling by setting a flag which will prevent the next
   * requestAnimationFrame() from being scheduled.
   */
  private stopPolling(): void {
    this.pollInProgress = false;
  }

  /**
   * A function called with each requestAnimationFrame().
   * Polls the gamepad status and schedules another poll.
   */
  private tick(): void {
    this.pollStatus();
    this.scheduleNextTick();
  }

  private scheduleNextTick(): void {
    // Only schedule the next frame if we haven’t decided to stop via
    // stopPolling() before.
    if (this.pollInProgress) {
      setTimeout(() => {
        this.tick();
      }, 1000 / GamepadConstants.POLLS_PER_SECOND);
    }
  }

  /**
   * Checks for the gamepad status. Monitors the necessary data and notices
   * the differences from previous state (buttons for Chrome/Firefox,
   * new connects/disconnects for Chrome). If differences are noticed, asks
   * to update the display accordingly. Should run as close to 60 frames per
   * second as possible.
   */
  private pollStatus(): void {
    // Poll to see if gamepads are connected or disconnected.
    this.pollGamepads();

    for (let i = 0; i < this.gamepads.length; i++) {
      const gamepad = this.gamepads[i];

      // Only if gamepad is ready, emit button and axes events
      if (this.gamepadReady) {
        this.checkButtonStatus(i, gamepad.buttons);
        this.checkAxesStatus(i, gamepad.axes);
      }
    }
  }

  /**
   * Checks which button was pressed or released by comparing with the previous button state.
   * @param connectedDeviceIndex the index of the active gamepad device.
   * @param buttons state of buttons in the given active gamepad.
   */
  private checkButtonStatus(connectedDeviceIndex: number, buttons: Array<GamepadButton>): void {
    const prevStateOfButtons = this.previousButtonState[connectedDeviceIndex];
    if (prevStateOfButtons) {
      for (let buttonId = 0; buttonId < buttons.length; buttonId++) {
        const previousButtonsOfCurrentGamepad = this.previousButtonState[connectedDeviceIndex];
        // Triggers act as stick.
        // Emit move event if button is a trigger.
        switch (buttonId) {
          case GamepadButtons.LEFT_TRIGGER:
          case GamepadButtons.RIGHT_TRIGGER:
            const value = this.getFixedDecimalValue(buttons[buttonId].value);
            const previous = previousButtonsOfCurrentGamepad[buttonId];

            // If in any of the triggers, value is greater than TRIGGER_DEADZONE_THRESHOLD,
            // then emit the event, else ignore
            if (
              value > GamepadConstants.TRIGGER_DEADZONE_THRESHOLD ||
              previous.value > GamepadConstants.TRIGGER_DEADZONE_THRESHOLD
            ) {
              const eventToFire =
                value > GamepadConstants.TRIGGER_DEADZONE_THRESHOLD
                  ? GamepadHandlerEvent.MOVE
                  : GamepadHandlerEvent.MOVE_STOPPED;
              previous.value = value;
              this.emit(eventToFire, connectedDeviceIndex, buttonId, value);
            }
            break;
          default:
            const buttonState = buttons[buttonId].pressed;
            if (buttonState || previousButtonsOfCurrentGamepad[buttonId].pressed) {
              const state = buttonState ? GamepadHandlerEvent.PRESSED : GamepadHandlerEvent.RELEASED;
              previousButtonsOfCurrentGamepad[buttonId].pressed = buttonState;
              this.emit(state, connectedDeviceIndex, buttonId);
            }
            break;
        }
      }
    } else {
      this.previousButtonState[connectedDeviceIndex] = [];
      for (const button of buttons) {
        this.previousButtonState[connectedDeviceIndex].push({ pressed: button.pressed, value: button.value });
      }
    }
  }

  /**
   * Checks which axes were moved by comparing with the previous axes state.
   * @param connectedDeviceIndex the index of the active gamepad device.
   * @param axes state of axes in the given active gamepad.
   */
  private checkAxesStatus(connectedDeviceIndex: number, axes: Array<number>): void {
    const prevStateOfAxes = this.previousAxesState[connectedDeviceIndex];
    if (prevStateOfAxes) {
      for (let axisId = 0; axisId < axes.length; axisId = axisId + 2) {
        const xValue = this.getFixedDecimalValue(axes[axisId]);
        const yValue = this.getFixedDecimalValue(axes[axisId + 1]);
        const previousXValue = prevStateOfAxes[axisId];
        const previousYValue = prevStateOfAxes[axisId + 1];
        const absXValue = Math.abs(xValue);
        const absYValue = Math.abs(yValue);
        const absPreviousXValue = Math.abs(previousXValue);
        const absPreviousYValue = Math.abs(previousYValue);

        // If in any of the axes, value is greater than STICK_DEADZONE_THRESHOLD, then emit the event, else ignore
        if (
          absXValue > GamepadConstants.STICK_DEADZONE_THRESHOLD ||
          absYValue > GamepadConstants.STICK_DEADZONE_THRESHOLD ||
          absPreviousXValue > GamepadConstants.STICK_DEADZONE_THRESHOLD ||
          absPreviousYValue > GamepadConstants.STICK_DEADZONE_THRESHOLD
        ) {
          let eventToFire = GamepadHandlerEvent.MOVE;

          // We will only consider that user has stopped the stick when we receive values within the
          // threshold ITERATIONS_TO_CONSIDER_AXES_MOVE_STOPPED number of times
          if (
            absXValue <= GamepadConstants.STICK_DEADZONE_THRESHOLD &&
            absYValue <= GamepadConstants.STICK_DEADZONE_THRESHOLD
          ) {
            if (!this.stopIterationCount[axisId]) {
              this.stopIterationCount[axisId] = 0;
            }

            this.stopIterationCount[axisId]++;

            if (this.stopIterationCount[axisId] > GamepadConstants.ITERATIONS_TO_CONSIDER_AXES_MOVE_STOPPED) {
              eventToFire = GamepadHandlerEvent.MOVE_STOPPED;
              this.stopIterationCount[axisId] = 0;
              prevStateOfAxes[axisId] = xValue;
              prevStateOfAxes[axisId + 1] = yValue;
            }
          } else {
            this.stopIterationCount[axisId] = 0;
            prevStateOfAxes[axisId] = xValue;
            prevStateOfAxes[axisId + 1] = yValue;
          }

          this.emit(eventToFire, connectedDeviceIndex, axisId, { x: xValue, y: yValue });
        }
      }
    } else {
      this.previousAxesState[connectedDeviceIndex] = axes.slice();
    }
  }

  // Monitor for changes.
  private pollGamepads(): void {
    // Get the array of gamepads – the first method (getGamepads)
    // is the most modern one and is supported by Firefox 28+ and
    // Chrome 35+. The second one (webkitGetGamepads) is a deprecated method
    // used by older Chrome builds.
    const rawGamepads: Array<Gamepad> =
      (window.navigator.getGamepads && window.navigator.getGamepads()) ||
      (window.navigator.webkitGetGamepads && window.navigator.webkitGetGamepads());

    if (rawGamepads) {
      // We don’t want to use rawGamepads coming straight from the browser,
      // since it can have “holes” (e.g. if you plug two gamepads, and then
      // unplug the first one, the remaining one will be at index [1]).
      this.gamepads = [];

      for (let i = 0; i < rawGamepads.length; i++) {
        // When a gamepad is disconnected, reset the prev state.
        if (this.previousGamepadState[i] && !rawGamepads[i]) {
          this.previousGamepadState[i] = false;

          // If no devices are connected, then set ready state to false.
          let anyDeviceConnected = false;
          for (const previousState of this.previousGamepadState) {
            if (previousState) {
              anyDeviceConnected = true;
              break;
            }
          }

          this.gamepadReady = anyDeviceConnected;

          // Emit the disconnected event.
          this.emit(GamepadHandlerEvent.DISCONNECTED, i);
        }

        if (rawGamepads[i] && rawGamepads[i].mapping === 'standard') {
          this.gamepads.push(rawGamepads[i]);
          if (rawGamepads[i].connected !== this.previousGamepadState[i]) {
            this.previousGamepadState[i] = rawGamepads[i].connected;

            // Emit the connected event.
            this.emit(GamepadHandlerEvent.CONNECTED, i, rawGamepads[i]);

            setTimeout(() => {
              this.gamepadReady = true;
            });
          }
        }
      }
    }
  }

  /**
   * Stops the polling for the gamepad activities.
   *
   * Call `init()` to start gamepad activities again.
   */
  shutdown(): void {
    this.stopPolling();
  }

  /**
   * Returns the number of currently attached gamepad devices.
   */
  numDevices(): number {
    return this.gamepads.length;
  }

  /**
   * Returns the specified gamepad's current state,
   * or undefined if deviceIndex is out of bounds.
   * @param index The index to find
   */
  deviceAtIndex(index: number): Gamepad {
    return this.gamepads[index];
  }

  private getFixedDecimalValue(value: number, decimalPlaces = 2): number {
    return Number(value.toFixed(decimalPlaces));
  }
}
