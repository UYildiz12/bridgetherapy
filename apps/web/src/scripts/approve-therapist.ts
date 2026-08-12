import { approveTherapist, TherapistApprovalError } from "../lib/approve-therapist";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: pnpm --filter web db:approve <email>");
    process.exit(1);
  }

  try {
    const result = await approveTherapist(email);
    if (result.status === "already-approved") {
      console.log(`${result.email} is already approved — no change.`);
    } else {
      console.log(`Approved therapist ${result.email} (${result.userId}).`);
    }
    process.exit(0);
  } catch (err) {
    if (err instanceof TherapistApprovalError) {
      console.error(`Cannot approve ${email}: ${err.message}`);
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

void main();
