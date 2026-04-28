const assert = require('node:assert/strict');

const BASE_URL = process.env.AUTH_BASE_URL || 'http://localhost:5000';

const cookieJar = new Map();

const splitSetCookieHeader = (header) => {
    if (!header) return [];
    const pieces = [];
    let current = '';
    let inExpires = false;

    for (let i = 0; i < header.length; i += 1) {
        const ch = header[i];
        if (header.slice(i, i + 8).toLowerCase() === 'expires=') {
            inExpires = true;
        }
        if (ch === ',' && !inExpires) {
            pieces.push(current.trim());
            current = '';
            continue;
        }
        if (ch === ';' && inExpires) {
            inExpires = false;
        }
        current += ch;
    }
    if (current.trim()) pieces.push(current.trim());
    return pieces;
};

const applySetCookies = (response) => {
    const rawCookies = typeof response.headers.getSetCookie === 'function'
        ? response.headers.getSetCookie()
        : splitSetCookieHeader(response.headers.get('set-cookie'));

    for (const cookieLine of rawCookies) {
        if (!cookieLine) continue;
        const first = cookieLine.split(';')[0];
        const idx = first.indexOf('=');
        if (idx <= 0) continue;
        const key = first.slice(0, idx).trim();
        const value = first.slice(idx + 1).trim();
        if (value) {
            cookieJar.set(key, value);
        } else {
            cookieJar.delete(key);
        }
    }
};

const cookieHeader = () => {
    if (cookieJar.size === 0) return '';
    return Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
};

const request = async (path, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    const cookies = cookieHeader();
    if (cookies) {
        headers.Cookie = cookies;
    }

    const response = await fetch(`${BASE_URL}${path}`, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    applySetCookies(response);

    let data = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    return { response, data };
};

const run = async () => {
    const email = `smoke_${Date.now()}@campusx.test`;
    const password = `smokePass_${Date.now()}`;

    console.log('STEP 1: register unique student user');
    const reg = await request('/api/auth/register', {
        method: 'POST',
        body: {
            name: 'Smoke Test User',
            email,
            password,
            role: 'student'
        }
    });
    assert.equal(reg.response.status, 201, `Expected 201, got ${reg.response.status}`);
    assert.equal(reg.data?.success, true, 'Register response should be success=true');
    console.log('PASS 1');

    console.log('STEP 2: me endpoint with cookie jar succeeds');
    const me = await request('/api/auth/me');
    assert.equal(me.response.status, 200, `Expected 200, got ${me.response.status}`);
    assert.equal(me.data?.success, true, 'Me response should be success=true');
    assert.equal(me.data?.data?.email, email, 'Me endpoint returned unexpected user email');
    console.log('PASS 2');

    console.log('STEP 3: refresh succeeds');
    const refresh = await request('/api/auth/refresh', { method: 'POST', body: {} });
    assert.equal(refresh.response.status, 200, `Expected 200, got ${refresh.response.status}`);
    assert.equal(refresh.data?.success, true, 'Refresh response should be success=true');
    console.log('PASS 3');

    console.log('STEP 4: logout succeeds');
    const logout = await request('/api/auth/logout', { method: 'POST', body: {} });
    assert.equal(logout.response.status, 200, `Expected 200, got ${logout.response.status}`);
    assert.equal(logout.data?.success, true, 'Logout response should be success=true');
    console.log('PASS 4');

    console.log('STEP 5: refresh after logout fails');
    const refreshAfterLogout = await request('/api/auth/refresh', { method: 'POST', body: {} });
    assert.equal(refreshAfterLogout.response.status, 401, `Expected 401, got ${refreshAfterLogout.response.status}`);
    assert.equal(refreshAfterLogout.data?.success, false, 'Refresh after logout should fail');
    console.log('PASS 5');

    console.log('AUTH SMOKE TEST PASSED');
};

run().catch((err) => {
    console.error('AUTH SMOKE TEST FAILED');
    console.error(err?.stack || err?.message || err);
    process.exit(1);
});
