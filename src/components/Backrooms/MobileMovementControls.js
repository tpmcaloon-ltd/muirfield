import {
  FaArrowDown,
  FaArrowLeft,
  FaArrowRight,
  FaArrowUp,
} from "react-icons/fa6";
import styles from "./MobileMovementControls.module.css";

const defaultInput = {
  forward: false,
  backward: false,
  turnLeft: false,
  turnRight: false,
};

function bindTouchControl(inputRef, key) {
  const setActive = (active) => {
    inputRef.current[key] = active;
  };

  return {
    "data-touch-control": true,
    onPointerDown: (event) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setActive(true);
    },
    onPointerUp: (event) => {
      event.preventDefault();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setActive(false);
    },
    onPointerCancel: () => {
      setActive(false);
    },
    onLostPointerCapture: () => {
      setActive(false);
    },
  };
}

export function createTouchInputState() {
  return { ...defaultInput };
}

export function resetTouchInputState(inputRef) {
  Object.assign(inputRef.current, defaultInput);
}

export default function MobileMovementControls({ inputRef, visible }) {
  return (
    <div
      className={`${styles.controls} ${visible ? "" : styles.controlsHidden}`}
      data-touch-control
      aria-hidden={!visible}
    >
      <button
        type="button"
        className={`${styles.btn} ${styles.btnUp}`}
        aria-label="Move forward"
        tabIndex={visible ? 0 : -1}
        {...bindTouchControl(inputRef, "forward")}
      >
        <FaArrowUp aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnLeft}`}
        aria-label="Turn left"
        tabIndex={visible ? 0 : -1}
        {...bindTouchControl(inputRef, "turnLeft")}
      >
        <FaArrowLeft aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnDown}`}
        aria-label="Move backward"
        tabIndex={visible ? 0 : -1}
        {...bindTouchControl(inputRef, "backward")}
      >
        <FaArrowDown aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnRight}`}
        aria-label="Turn right"
        tabIndex={visible ? 0 : -1}
        {...bindTouchControl(inputRef, "turnRight")}
      >
        <FaArrowRight aria-hidden="true" />
      </button>
    </div>
  );
}
