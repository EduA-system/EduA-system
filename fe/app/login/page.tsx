import { Rubik } from "next/font/google";
import { AuthFlow } from "./AuthFlow";

const rubik = Rubik({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export default function LoginPage() {
  return <AuthFlow fontClassName={rubik.className} />;
}