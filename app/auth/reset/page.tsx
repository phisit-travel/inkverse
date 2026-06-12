import { redirect } from "next/navigation";

// Password reset moved to an OTP flow on /auth/forgot. Keep this path alive so
// any old emailed links land somewhere sensible instead of a dead form.
export default function ResetPasswordRedirect() {
  redirect("/auth/forgot");
}
