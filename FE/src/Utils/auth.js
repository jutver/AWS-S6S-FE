import { fetchAuthSession } from "aws-amplify/auth";

export async function getAuthToken() {
  const session = await fetchAuthSession();

  const accessToken = session.tokens?.accessToken?.toString();
  const idToken = session.tokens?.idToken?.toString();

  const token = accessToken || idToken;

  if (!token) {
    throw new Error("No auth token found. Please log in again.");
  }

  return token;
}
