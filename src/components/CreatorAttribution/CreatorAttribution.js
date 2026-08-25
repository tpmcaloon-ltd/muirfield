import styles from "./CreatorAttribution.module.css";

export default function CreatorAttribution() {
  return (
    <p className={styles.attribution}>
      <span className={styles.prefix}>Created by </span>
      <a
        href="https://www.youtube.com/@codegrid"
        target="_blank"
        rel="noopener noreferrer"
        className={`${styles.brand} underline-hover`}
      >
        Codegrid
      </a>
    </p>
  );
}
