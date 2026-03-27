# Database & Secret Keys Usage Examples

## 📁 Environment Configuration (.env)

```env
# PostgreSQL Database (Neon)
DATABASE_URL=postgresql://neondb_owner:npg_n2qhHke8cREw@ep-lively-paper-a1row9c9-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Steadfast Courier API Keys
STEADFAST_API_KEY=222348989448322
STEADFAST_SECRET_KEY=hR7sybpkUirMNf36XncbR4PHNM8
STEADFAST_WEBHOOK_SECRET=dw615dyqc

# Admin Session Secret
ADMIN_SESSION_SECRET=krishi-bitan-admin-secret-2024
```

---

## 1. Database Connection Example

### File: `src/db/index.ts`

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Get database URL from environment variable
const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

// Create postgres connection with SSL and connection pooling
const client = postgres(DATABASE_URL, { 
  ssl: 'require',           // Required for Neon PostgreSQL
  max: 10,                  // Connection pool size
  idle_timeout: 30,         // Close idle connections after 30s
  connect_timeout: 10,      // Fail fast if DB unreachable
  prepare: true,            // Faster repeated queries
})

const db = drizzle(client, { schema })

export { db }
```

### Usage Example - Query Orders:

```typescript
import { db } from '@/db'
import { orders } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Get all orders
const allOrders = await db.select().from(orders)

// Get specific order by ID
const order = await db.select()
  .from(orders)
  .where(eq(orders.id, 'ORDER-123'))
  .limit(1)

// Create new order
await db.insert(orders).values({
  id: 'ORDER-123',
  customerName: 'John Doe',
  phone: '01712345678',
  address: 'Dhaka, Bangladesh',
  total: 1500,
  status: 'pending',
})

// Update order status
await db.update(orders)
  .set({ status: 'delivered' })
  .where(eq(orders.id, 'ORDER-123'))
```

---

## 2. Steadfast Courier API Example

### File: `src/lib/steadfast.ts`

```typescript
// Steadfast API base URL
const BASE_URL = 'https://portal.packzy.com/api/v1'

// Headers with your API credentials
const headers = {
  'Api-Key': process.env.STEADFAST_API_KEY,      // 222348989448322
  'Secret-Key': process.env.STEADFAST_SECRET_KEY, // hR7sybpkUirMNf36XncbR4PHNM8
  'Content-Type': 'application/json',
}
```

### Usage Example - Create Order:

```typescript
import { steadfastService } from '@/lib/steadfast'

// Create a delivery order
const result = await steadfastService.createOrder({
  invoice: 'ORDER-123',           // Your order ID
  recipient_name: 'John Doe',      // Customer name
  recipient_phone: '01712345678',  // 11 digit phone
  recipient_address: 'Dhaka',      // Delivery address
  cod_amount: 1500,                // Cash on delivery amount
  note: 'Payment: COD',            // Optional note
})

// Response:
// {
//   status: 200,
//   message: 'Order created successfully',
//   consignment: {
//     consignment_id: 123456,
//     tracking_code: 'SF123456789',
//     status: 'in_review'
//   }
// }
```

### Usage Example - Check Balance:

```typescript
// Check your Steadfast account balance
const balance = await steadfastService.getBalance()
console.log('Current balance:', balance.current_balance)
```

### Usage Example - Track Order:

```typescript
// Track by consignment ID
const status = await steadfastService.getStatusByConsignmentId(123456)

// Track by invoice/order ID
const status = await steadfastService.getStatusByInvoice('ORDER-123')

// Track by tracking code
const status = await steadfastService.getStatusByTrackingCode('SF123456789')
```

---

## 3. Webhook Handler Example

### File: `src/app/api/courier/webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { orders } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  // Verify webhook secret
  const webhookSecret = request.headers.get('x-webhook-secret')
  if (webhookSecret !== process.env.STEADFAST_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }
  
  // Update order status based on webhook
  const { consignment_id, status, invoice } = body
  
  await db.update(orders)
    .set({ 
      courierStatus: status,
      updatedAt: new Date() 
    })
    .where(eq(orders.id, invoice))
  
  return NextResponse.json({ success: true })
}
```

---

## 4. Admin Authentication Example

### Using Session Secret:

```typescript
import { sign, verify } from 'jsonwebtoken'

const SECRET = process.env.ADMIN_SESSION_SECRET

// Create admin session token
function createAdminToken(adminId: string) {
  return sign({ adminId }, SECRET, { expiresIn: '24h' })
}

// Verify admin session
function verifyAdminToken(token: string) {
  try {
    return verify(token, SECRET)
  } catch {
    return null
  }
}
```

---

## 5. API Route Examples

### File: `src/app/api/orders/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { orders } from '@/db/schema'

// GET /api/orders - Get all orders
export async function GET() {
  const allOrders = await db.select().from(orders)
  return NextResponse.json({ orders: allOrders })
}

// POST /api/orders - Create new order
export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const newOrder = await db.insert(orders).values({
    customerName: body.customerName,
    phone: body.phone,
    address: body.address,
    total: body.total,
    status: 'pending',
  }).returning()
  
  return NextResponse.json({ order: newOrder[0] })
}
```

---

## 6. Credential Storage in Database

Credentials are stored in the `settings` table with AES-256 encryption:

```typescript
import { safeEncrypt, safeDecrypt } from '@/lib/security'

// Save encrypted credentials
const encryptedApiKey = safeEncrypt('222348989448322')
const encryptedSecretKey = safeEncrypt('hR7sybpkUirMNf36XncbR4PHNM8')

await db.update(settings)
  .set({
    steadfastApiKey: encryptedApiKey,
    steadfastSecretKey: encryptedSecretKey,
  })
  .where(eq(settings.id, 1))

// Retrieve and decrypt
const result = await db.select().from(settings).where(eq(settings.id, 1))
const apiKey = safeDecrypt(result[0].steadfastApiKey)
```

---

## Summary

| Key | Purpose | Where Used |
|-----|---------|-----------|
| `DATABASE_URL` | PostgreSQL connection | `src/db/index.ts` |
| `STEADFAST_API_KEY` | Courier API authentication | `src/lib/steadfast.ts` |
| `STEADFAST_SECRET_KEY` | Courier API authentication | `src/lib/steadfast.ts` |
| `STEADFAST_WEBHOOK_SECRET` | Verify webhook requests | `src/app/api/courier/webhook/route.ts` |
| `ADMIN_SESSION_SECRET` | Admin login sessions | `src/lib/api-auth.ts` |
