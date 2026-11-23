import type { Metadata } from "next";
import EmailPreview from "@/components/email-preview";

export const metadata: Metadata = {
  title: "Vista previa del correo | Secret Santa",
  robots: { index: false, follow: false },
};

export default function EmailPreviewPage() {
  return <EmailPreview />;
}
