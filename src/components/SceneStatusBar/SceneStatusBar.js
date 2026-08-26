import styles from "./SceneStatusBar.module.css";

export default function SceneStatusBar({ connected, engine }) {
  return (
    <div className={styles.statusBar}>
      Connected: {connected}
      <span className={styles.separator}>, </span>
      Engine: {engine}
    </div>
  );
}
