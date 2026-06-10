import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ContactForm from "@/components/ui/ContactForm";
import { Mail, MessageSquare } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ติดต่อแอดมิน | INKVERSE" };

export default async function ContactPage() {
  const session = await auth();
  let name = "";
  let email = "";
  if (session?.user) {
    const u = await prisma.user.findUnique({
      where: { id: (session.user as { id: string }).id },
      select: { username: true, email: true },
    });
    name = u?.username ?? "";
    email = u?.email ?? "";
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-3 mb-1">
        <MessageSquare className="w-7 h-7 text-[var(--text-primary)]" />
        <h1 className="font-bebas text-4xl text-[var(--text-primary)] tracking-wider">
          ติดต่อแอดมิน
        </h1>
      </div>
      <p className="text-[var(--text-secondary)] text-sm mb-8">
        มีปัญหาการใช้งาน เติมเงิน ปลดล็อก หรือเรื่องลิขสิทธิ์? ส่งข้อความถึงทีมงานได้เลย
      </p>

      <ContactForm defaultName={name} defaultEmail={email} />

      <div className="mt-8 flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <Mail className="w-3.5 h-3.5" />
        หรืออีเมลโดยตรงที่ support@inkverse.io
      </div>
    </div>
  );
}
