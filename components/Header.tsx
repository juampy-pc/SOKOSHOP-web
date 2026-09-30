import HeaderClient from "./HeaderClient";
import { navGroups } from "@/lib/nav";

export default async function Header() {
  return <HeaderClient groups={await navGroups()} />;
}
