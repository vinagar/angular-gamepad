export const enum GamepadConstants {
  /**
   * Ignore values of axes in the range of -threshold to +threshold
   */
  STICK_DEADZONE_THRESHOLD = 0.15, // If  keeping with 0.1, then joystick small movement event has been triggerred without user interaction.

  /**
   * Ignore values of triggers in the range of -threshold to +threshold
   */
  TRIGGER_DEADZONE_THRESHOLD = 0.05,

  /**
   * Decides how many times the gamepad events should be checked per second
   */
  POLLS_PER_SECOND = 60,

  /**
   * The number of iterations you will perform before declaring
   * that any axes is in resting position and user is not transitioning
   * from left to right or top to bottom and vice versa
   */
  ITERATIONS_TO_CONSIDER_AXES_MOVE_STOPPED = 5
}
