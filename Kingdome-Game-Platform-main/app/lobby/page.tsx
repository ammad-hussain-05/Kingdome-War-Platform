import LobbyScreen from "@/components/lobby/lobby-screen";
import { Footer } from "@/components/footer";
import { DisclaimerFeedback } from "@/components/disclaimer-feedback";

export default function LobbyPage() {
  return (
    <>
      <LobbyScreen />
      <DisclaimerFeedback />
      <Footer />
    </>
  );
}
