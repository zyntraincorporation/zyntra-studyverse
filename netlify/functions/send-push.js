// ─────────────────────────────────────────────────────────────────────────────
// Netlify Serverless Function: send-push
// Sends FCM push notifications via Firebase Admin SDK
// Works on Spark (free) plan — no Cloud Functions needed
//
// ENV VARS required in Netlify dashboard:
//   FIREBASE_SERVICE_ACCOUNT  — the full service account JSON as a string
// ─────────────────────────────────────────────────────────────────────────────

// Use dynamic import to load google-auth-library (ES module compatible)
async function getAccessToken(serviceAccount) {
  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  const client = await auth.getClient();
  const token  = await client.getAccessToken();
  return token.token;
}

export const handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { token, title, body: msgBody, data = {} } = body;

  if (!token || !title) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing token or title' }) };
  }

  // Load service account from environment
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountStr) {
    console.error('[send-push] FIREBASE_SERVICE_ACCOUNT env var not set');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountStr);
  } catch {
    return { statusCode: 500, body: JSON.stringify({ error: 'Invalid service account JSON' }) };
  }

  const projectId = serviceAccount.project_id;

  try {
    const accessToken = await getAccessToken(serviceAccount);

    const fcmMessage = {
      message: {
        token,
        notification: {
          title,
          body: msgBody || '',
        },
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ),
        android: {
          priority: 'high',
          notification: {
            icon:          'ic_notification',
            color:         '#06b6d4',
            channel_id:    'zyntra_chat',
            click_action:  'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        webpush: {
          headers: {
            Urgency: 'high',
          },
          notification: {
            icon:    '/android-chrome-192x192.png',
            badge:   '/favicon-32x32.png',
            vibrate: [200, 100, 200],
            requireInteraction: data.type === 'chat_message',
          },
          fcm_options: {
            link: data.type === 'chat_message' ? '/chat' : '/',
          },
        },
      },
    };

    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    const res = await fetch(fcmUrl, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(fcmMessage),
    });

    const result = await res.json();

    if (!res.ok) {
      // Token might be invalid (user uninstalled/cleared browser)
      if (result?.error?.status === 'NOT_FOUND' || result?.error?.status === 'INVALID_ARGUMENT') {
        console.warn('[send-push] Token no longer valid:', token);
        return {
          statusCode: 200,
          body: JSON.stringify({ success: false, reason: 'invalid_token' }),
        };
      }
      console.error('[send-push] FCM error:', result);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'FCM send failed', details: result }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, messageId: result.name }),
    };
  } catch (err) {
    console.error('[send-push] Unexpected error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
