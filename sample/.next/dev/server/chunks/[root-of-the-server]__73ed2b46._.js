module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/sample/app/api/checkout/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
;
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
        description: 'This is a test purchase item'
    },
    user: {
        id: '1d56f95f-28df-4ea5-9829-9671241f455e',
        validatedEmail: 'test@rovio.com',
        regionCode: 'US',
        platform: 'IOS'
    }
};
async function POST(request) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${requestId}] POST /api/checkout - Request received`);
    console.log(`[${requestId}] Environment check - STASH_API_KEY exists: ${!!STASH_API_KEY}`);
    console.log(`[${requestId}] STASH_API_URL: ${STASH_API_URL}`);
    try {
        console.log(`[${requestId}] Parsing request body...`);
        const requestBody = await request.json().catch((parseError)=>{
            console.error(`[${requestId}] Failed to parse request body:`, parseError);
            return {};
        });
        console.log(`[${requestId}] Request body received:`, JSON.stringify(requestBody, null, 2));
        // Merge request body with default payload (request body takes precedence)
        const payload = {
            ...DEFAULT_PAYLOAD,
            ...requestBody,
            item: {
                ...DEFAULT_PAYLOAD.item,
                ...requestBody.item || {}
            },
            user: {
                ...DEFAULT_PAYLOAD.user,
                ...requestBody.user || {}
            }
        };
        console.log(`[${requestId}] Final payload to send:`, JSON.stringify(payload, null, 2));
        console.log(`[${requestId}] Making request to Stash API...`);
        const fetchStartTime = Date.now();
        const response = await fetch(STASH_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Stash-Api-Key': STASH_API_KEY || ''
            },
            body: JSON.stringify(payload)
        });
        const fetchDuration = Date.now() - fetchStartTime;
        console.log(`[${requestId}] Stash API response received - Status: ${response.status} ${response.statusText}, Duration: ${fetchDuration}ms`);
        console.log(`[${requestId}] Response headers:`, Object.fromEntries(response.headers.entries()));
        if (!response.ok) {
            console.error(`[${requestId}] Stash API returned error status: ${response.status}`);
            const errorText = await response.text().catch(()=>'Failed to read error response');
            console.error(`[${requestId}] Error response body:`, errorText);
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch  {
                errorData = {
                    raw: errorText
                };
            }
            console.error(`[${requestId}] Parsed error data:`, JSON.stringify(errorData, null, 2));
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Failed to generate checkout link',
                details: errorData,
                requestId
            }, {
                status: response.status
            });
        }
        console.log(`[${requestId}] Parsing successful response...`);
        const responseText = await response.text();
        console.log(`[${requestId}] Raw response body:`, responseText);
        let data;
        try {
            data = JSON.parse(responseText);
            console.log(`[${requestId}] Parsed response data:`, JSON.stringify(data, null, 2));
        } catch (parseError) {
            console.error(`[${requestId}] Failed to parse response JSON:`, parseError);
            throw new Error(`Invalid JSON response from Stash API: ${parseError}`);
        }
        console.log(`[${requestId}] Request completed successfully`);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(data);
    } catch (error) {
        console.error(`[${requestId}] Error generating checkout link:`, error);
        console.error(`[${requestId}] Error type:`, error instanceof Error ? error.constructor.name : typeof error);
        console.error(`[${requestId}] Error message:`, error instanceof Error ? error.message : String(error));
        console.error(`[${requestId}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
            requestId
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__73ed2b46._.js.map