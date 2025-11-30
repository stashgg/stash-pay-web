import { NextRequest, NextResponse } from 'next/server';

const STASH_API_URL = 'https://test-api.stash.gg/sdk/server/checkout_links/generate_quick_pay_url';
const STASH_API_KEY = process.env.STASH_API_KEY;

const DEFAULT_PAYLOAD = {
  regionCode: 'USA',
  currency: 'USD',
  item: {
    id: '1d56f95f-28df-4ea5-9829-9671241f455e',
    pricePerItem: '0.50',
    quantity: 1,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/en/2/2d/Angry_Birds_promo_art.png',
    name: 'Test Item',
    description: 'This is a test purchase item',
  },
  user: {
    id: '1d56f95f-28df-4ea5-9829-9671241f455e',
    validatedEmail: 'test@rovio.com',
    regionCode: 'US',
    platform: 'IOS',
  },
};

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json().catch(() => ({}));
    
    // Merge request body with default payload (request body takes precedence)
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
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: 'Failed to generate checkout link',
          details: errorData,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating checkout link:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

