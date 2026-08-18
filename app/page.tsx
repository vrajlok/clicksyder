import type { Metadata } from "next";
import { ClicksyderApp } from "./clicksyder-app";

export const metadata: Metadata = {
  title: "Clicksyder",
  description: "Gestão de vendas avulsas e estoque, em um só lugar.",
};

export default function Home() {
  return <ClicksyderApp />;
}
