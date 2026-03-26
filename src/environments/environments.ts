export const environment = {
  production: false,
  // apiUrl: 'http://localhost:8080',
  apiUrl: 'https://fp-api-production-36dd.up.railway.app',
  // apiUrl: 'http://fantacypool-api-env.eba-c8dpmph3.us-east-2.elasticbeanstalk.com',

  // WebSockets disabled — set true and uncomment websocket code to re-enable
  enableWebSockets: false,
  /** Feature toggle: show Analytics nav and allow /analytics route */
  features: {
    analytics: true
  }
};
