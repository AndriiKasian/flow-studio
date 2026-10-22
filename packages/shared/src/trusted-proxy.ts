// Headers sent by the web server to the API on behalf of a visitor. The API
// trusts the forwarded client IP only when the proxy secret matches.
export const TRUSTED_PROXY_SECRET_HEADER = "x-flow-studio-proxy-secret";
export const TRUSTED_CLIENT_IP_HEADER = "x-flow-studio-client-ip";
