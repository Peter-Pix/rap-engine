import { redirect } from "next/navigation";

/** Legacy URL /ask → /zeptej-se (přejmenováno kvůli srozumitelnější adrese). */
export default function AskRedirect() {
  redirect("/zeptej-se");
}
