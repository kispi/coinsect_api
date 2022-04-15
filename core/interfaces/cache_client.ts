interface ICacheClient {
  set: (key: string, value: unknown, seconds?: number) => unknown,
  get: (key: string) => Promise<any>,
  del: (key: string) => unknown,
}

export default ICacheClient