export default {
  get: jest.fn(() => {
    // axios.get() response:
    return Promise.resolve({ data: {} });
  }),
  post: jest.fn(() => {
    return Promise.resolve({ data: {} });
  }),
  interceptors: {
    request: {
      use: () => {},
    },
    response: {
      use: () => {},
    },
  },
};
