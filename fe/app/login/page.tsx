import { Suspense } from "react";
import { Be_Vietnam_Pro } from "next/font/google";
import { AuthFlow } from "./AuthFlow";

const rubik = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
});

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthFlow fontClassName={rubik.className} />
    </Suspense>
  );
}
