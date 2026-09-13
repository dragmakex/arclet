import { redirect } from "next/navigation";

/** Arclet opens on the financial desk rather than a separate marketing surface. */
export default function Home() {
  redirect("/wallet");
}
