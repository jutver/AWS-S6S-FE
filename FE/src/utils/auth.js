import { fetchAuthSession } from "aws-amplify/auth";

export async function getAuthToken() {
  const session = await fetchAuthSession();

  const idToken = session.tokens?.idToken?.toString();

  if (!idToken) {
    throw new Error("No auth token found. Please log in again.");
  }

  return idToken;
}