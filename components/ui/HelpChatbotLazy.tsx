"use client";

import dynamic from "next/dynamic";

const HelpChatbot = dynamic(() => import("@/components/ui/HelpChatbot"), {
  ssr: false,
});

export default function HelpChatbotLazy() {
  return <HelpChatbot />;
}
