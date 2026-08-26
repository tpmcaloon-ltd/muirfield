"use client";

import styles from "./FilmSynopsis.module.css";
import AnimatedText from "@/components/AnimatedText/AnimatedText";

export default function FilmSynopsis() {
  return (
    <section className={styles.synopsis}>
      <div className={styles.inner}>
        <AnimatedText variant="variant2" splitBy="lines">
          <h1 className={styles.title}>
            A strange doorway appears in the basement of a furniture showroom.
          </h1>
        </AnimatedText>

        <dl className={styles.credits}>
          <AnimatedText variant="variant2" splitBy="lines">
            <div className={styles.creditItem}>
              <dt className={styles.label}>Directed by</dt>
              <dd className={styles.value}>Kane Parsons</dd>
            </div>
          </AnimatedText>

          <AnimatedText variant="variant2" splitBy="lines">
            <div className={styles.creditItem}>
              <dt className={styles.label}>Written by</dt>
              <dd className={styles.value}>Will Soodik</dd>
            </div>
          </AnimatedText>

          <AnimatedText variant="variant2" splitBy="lines">
            <div className={styles.creditItem}>
              <dt className={styles.label}>Starring</dt>
              <dd className={styles.value}>Chiwetel Ejiofor</dd>
            </div>
          </AnimatedText>

          <AnimatedText variant="variant2" splitBy="lines">
            <div className={styles.creditItem}>
              <dt className={styles.label}>Year</dt>
              <dd className={styles.value}>2026</dd>
            </div>
          </AnimatedText>
        </dl>
      </div>
    </section>
  );
}
