"use client";

import dynamic from "next/dynamic";

interface Genre {
  id: string;
  name: string;
  slug: string;
}

interface UploadFormProps {
  genres: Genre[];
}

const UploadForm = dynamic(() => import("@/components/ui/UploadForm"), {
  ssr: false,
});

export default function UploadFormLazy(props: UploadFormProps) {
  return <UploadForm {...props} />;
}
