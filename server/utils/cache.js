const cache = new Map();
const pendingRequests = new Map();

export const getCache = (key) => {
  const cached = cache.get(key);

  if (!cached) {
    return null;
  }

  if (Date.now() > cached.expiresAt) {
    cache.delete(key);
    return null;
  }

  return cached.data;
};

export const setCache = (key, data, ttl) => {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
};

export const getPendingRequest = (key) => {
  return pendingRequests.get(key);
};

export const setPendingRequest = (key, promise) => {
  pendingRequests.set(key, promise);

  promise.then(
    () => {
      pendingRequests.delete(key);
    },
    () => {
      pendingRequests.delete(key);
    }
  );

  return promise;
};

export const deleteCache = (key) => {
  cache.delete(key);
};

export const clearCache = () => {
  cache.clear();
};