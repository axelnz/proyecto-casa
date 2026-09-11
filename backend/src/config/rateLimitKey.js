const { isIP } = require('node:net');
const { ipKeyGenerator } = require('express-rate-limit');

function createRateLimitKey(env = process.env) {
  const onRender = env.RENDER === 'true';
  return function rateLimitKey(req) {
    // Render's public ingress goes through Cloudflare, which supplies this header.
    // X-Forwarded-For can contain caller-supplied entries and intermediate proxies.
    const candidate = onRender ? req.get('CF-Connecting-IP') : req.ip;
    const ip = typeof candidate === 'string' && isIP(candidate)
      ? candidate : req.socket.remoteAddress;
    // Group IPv6 clients by subnet, so rotating addresses cannot reset the limit.
    return ipKeyGenerator(ip || 'unknown');
  };
}

module.exports = { createRateLimitKey, rateLimitKey: createRateLimitKey() };
