import { NextRequest, NextResponse } from 'next/server';

const STASH_API_URL =
  'https://test-api.stash.gg/sdk/server/checkout_links/generate_quick_pay_url';
const STASH_API_KEY = process.env.STASH_API_KEY;

const DEFAULT_PAYLOAD = {
  regionCode: 'USA',
  currency: 'USD',
  item: {
    id: '1d56f95f-28df-4ea5-9829-9671241f455e',
    pricePerItem: '1.99',
    quantity: 1,
    imageUrl:
      'https://docs.stash.gg/favicon.png',
    name: 'Test Item',
    description: 'This is a test purchase item',
  },
  user: {
    id: '1d56f95f-28df-4ea5-9829-9671241f455e',
    validatedEmail: 'test@stash.gg',
    regionCode: 'US',
    platform: 'IOS',
  },
};

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  if (!STASH_API_KEY) {
    console.error(`[${requestId}] STASH_API_KEY is not set`);
    return NextResponse.json(
      {
        error: 'Server misconfiguration',
        message: 'STASH_API_KEY is not set',
        requestId,
      },
      { status: 500 },
    );
  }

  try {
    const requestBody = await request.json().catch(() => ({}));

    const payload = {
      ...DEFAULT_PAYLOAD,
      ...requestBody,
      item: {
        ...DEFAULT_PAYLOAD.item,
        ...(requestBody.item || {}),
      },
      user: {
        ...DEFAULT_PAYLOAD.user,
        ...(requestBody.user || {}),
      },
    };

    const response = await fetch(STASH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Stash-Api-Key': STASH_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Failed to read error response');
      let errorData: unknown;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { raw: errorText };
      }

      return NextResponse.json(
        {
          error: 'Failed to generate checkout link',
          details: errorData,
          requestId,
        },
        { status: response.status },
      );
    }

    const responseText = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(
        `Invalid JSON response from Stash API: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(`[${requestId}] Error generating checkout link:`, error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 },
    );
  }
}
