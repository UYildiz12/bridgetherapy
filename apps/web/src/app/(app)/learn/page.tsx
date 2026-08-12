import { redirect } from "next/navigation";

// Learn is now part of the Wellness hub (the "Learn" tab).
export default function LearnPage() {
  redirect("/wellness");
}
