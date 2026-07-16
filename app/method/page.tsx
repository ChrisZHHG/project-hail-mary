import type { Metadata } from "next";
import TheoryList from "@/components/TheoryList";
import MethodChrome from "@/components/MethodChrome";

export const metadata: Metadata = { title: "Method" };

export default function MethodPage() {
  return <MethodChrome list={<TheoryList />} />;
}
