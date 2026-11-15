import http from 'k6/http';
import { check } from 'k6';
import { sleep } from 'k6';

const baseUrl = (__ENV.BASE_URL || 'http://127.0.0.1:4173').replace(/\/+$/, '');
const virtualUsers = Number(__ENV.VUS || 500);
const loadAssets = __ENV.LOAD_ASSETS !== 'false';
const sessionHoldSeconds = Number(__ENV.SESSION_HOLD_SECONDS || 65);
const ramp = (percentage) => Math.max(1, Math.ceil(virtualUsers * percentage));
const paths = ['/', '/repertorio', '/actuaciones', '/contacto'];

export const options = {
  scenarios: {
    site_visits: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: ramp(0.1) },
        { duration: '10s', target: ramp(0.2) },
        { duration: '10s', target: ramp(0.5) },
        { duration: '10s', target: virtualUsers },
        { duration: '20s', target: virtualUsers },
        { duration: '5s', target: 0 },
      ],
      gracefulRampDown: '10s',
      gracefulStop: '10s',
    },
  },
  thresholds: {
    checks: ['rate>0.98'],
    http_req_failed: ['rate<0.02'],
  },
};

function localAssetUrl(path) {
  const assetPath = path.replace(/^\/AM\.VS_WEB/, '');
  return `${baseUrl}${assetPath}`;
}

export default function () {
  if (__ITER > 0) {
    sleep(sessionHoldSeconds);
    return;
  }

  const route = paths[(__VU - 1) % paths.length];
  const page = http.get(`${baseUrl}${route}`, { tags: { resource: 'html' } });

  const pageIsAvailable = check(page, {
    'page responds with HTTP 200': (response) => response.status === 200,
  });
  if (!pageIsAvailable) {
    sleep(sessionHoldSeconds);
    return;
  }

  const scriptPath = page.body.match(/src="([^"]+\.js)"/)?.[1];
  const stylesheetPath = page.body.match(/href="([^"]+\.css)"/)?.[1];
  const assetsExist = check(page, {
    'page references its JS and CSS assets': () => Boolean(scriptPath && stylesheetPath),
  });
  if (!assetsExist || !loadAssets) {
    sleep(sessionHoldSeconds);
    return;
  }

  const assets = http.batch([
    ['GET', localAssetUrl(scriptPath), null, { tags: { resource: 'javascript' } }],
    ['GET', localAssetUrl(stylesheetPath), null, { tags: { resource: 'css' } }],
  ]);
  check(assets[0], {
    'JavaScript bundle responds with HTTP 200': (response) => response.status === 200,
  });
  check(assets[1], {
    'stylesheet responds with HTTP 200': (response) => response.status === 200,
  });
  sleep(sessionHoldSeconds);
}
