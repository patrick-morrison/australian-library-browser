function createElectronLaunchEnv(overrides = {}) {
  const env = {
    ...process.env,
    ...overrides
  };
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

module.exports = {
  createElectronLaunchEnv
};
