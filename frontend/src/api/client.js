// Legacy compatibility client. New product flows use src/lib/supabase.js.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

async function request(config = {}) {
  const method = config.method || 'GET';
  const url = config.url || '';
  const headers = {
    'Content-Type': 'application/json',
    ...(config.headers || {})
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    method,
    headers,
    body: config.data == null ? undefined : JSON.stringify(config.data)
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw Object.assign(new Error(extractErrorMessage({ response: { data: payload } })), {
      response: { status: response.status, data: payload }
    });
  }

  return {
    data: payload,
    status: response.status
  };
}

export const apiClient = {
  request,
  get(url, config = {}) {
    return request({ ...config, method: 'GET', url });
  },
  post(url, data, config = {}) {
    return request({ ...config, method: 'POST', url, data });
  },
  put(url, data, config = {}) {
    return request({ ...config, method: 'PUT', url, data });
  },
  patch(url, data, config = {}) {
    return request({ ...config, method: 'PATCH', url, data });
  },
  delete(url, config = {}) {
    return request({ ...config, method: 'DELETE', url });
  }
};

export function extractErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Something went wrong. Please try again.'
  );
}
