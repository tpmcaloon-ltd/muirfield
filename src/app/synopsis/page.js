import CreditsDrawer from "@/components/CreditsDrawer/CreditsDrawer";
import FilmSynopsis from "@/components/FilmSynopsis/FilmSynopsis";
import Footer from "@/components/Footer/Footer";
import PosterCloth from "@/components/PosterCloth/PosterCloth";
import styles from "./page.module.css";

export default function SynopsisPage() {
  return (
    <main className={styles.main}>
      <PosterCloth />
      <FilmSynopsis />
      <Footer />
      <CreditsDrawer />
    </main>
  );
}
