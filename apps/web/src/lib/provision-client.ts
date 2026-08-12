export interface ProvisionInput {
  firstName: string;
  lastName: string;
  role: "PATIENT" | "THERAPIST";
}

export async function provisionUser(accessToken: string, input: ProvisionInput) {
  const res = await fetch("/api/auth/provision", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Provision failed: ${res.status}`);
  const body = await res.json();
  return body.data as { id: string };
}
