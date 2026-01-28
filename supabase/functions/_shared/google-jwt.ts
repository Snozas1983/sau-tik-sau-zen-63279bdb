// JWT-based Google Service Account Authentication
// This module handles authentication using Service Account credentials

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

// Base64URL encode function
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Get access token using Service Account JWT
export async function getServiceAccountAccessToken(): Promise<string | null> {
  const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');

  if (!serviceAccountEmail || !privateKey) {
    console.error('Service Account credentials not configured');
    return null;
  }

  try {
    const jwt = await createSignedJWT(serviceAccountEmail, privateKey, CALENDAR_SCOPES);

    // Exchange JWT for access token
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Token exchange error:', data);
      return null;
    }

    return data.access_token;
  } catch (error) {
    console.error('Error getting Service Account access token:', error);
    return null;
  }
}

// Create signed JWT asynchronously
async function createSignedJWT(
  serviceAccountEmail: string,
  privateKey: string,
  scopes: string[]
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const payload = {
    iss: serviceAccountEmail,
    scope: scopes.join(' '),
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: exp
  };

  const textEncoder = new TextEncoder();
  const headerB64 = base64UrlEncode(textEncoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(textEncoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Clean the private key
  const cleanedKey = privateKey
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  // Convert base64 to bytes
  const binaryDer = Uint8Array.from(atob(cleanedKey), c => c.charCodeAt(0));

  // Import the private key
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );

  // Sign the input
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    textEncoder.encode(signingInput)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signatureBuffer));

  return `${signingInput}.${signatureB64}`;
}

// Get calendar ID from settings or use default
export async function getCalendarId(supabase: any): Promise<string> {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'google_calendar_id')
    .maybeSingle();

  return data?.value || 'primary';
}
