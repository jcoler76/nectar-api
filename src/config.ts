interface Config {
  API_URL: string | undefined;
}

const config: Config = {
  API_URL: process.env.REACT_APP_API_URL,
};

export const API_URL = config.API_URL;

export default config;
