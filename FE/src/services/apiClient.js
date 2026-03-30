import { getAuthToken } from "../utils/auth";

const API_BASE_URL =
  "https://ipiizwxzu2.execute-api.ap-southeast-1.amazonaws.com/dev";

async function request(path, options = {}) {
  const token = await getAuthToken();

  const headers = {
    "Content-Type": "application/json",
    Authorization: `${token}`,
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
      data?.message ||
      `Request failed: ${response.status}`,
    );
  }

  return data;
}

export const apiClient = {
  get(path, options = {}) {
    return request(path, { ...options, method: "GET" });
  },

  post(path, body, options = {}) {
    return request(path, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  patch(path, body, options = {}) {
    return request(path, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  put(path, body, options = {}) {
    return request(path, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  delete(path, options = {}) {
    return request(path, { ...options, method: "DELETE" });
  },
};
