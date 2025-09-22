# FechasHabilesAPI

A comprehensive REST API for calculating Colombian business days and hours, implementing complex business rules including working hours, lunch breaks, weekends, and Colombian holidays.

## 📋 Business Rules

- **Working days**: Monday through Friday
- **Working hours**: 8:00 AM - 5:00 PM (Colombia time)
- **Lunch break**: 12:00 PM - 1:00 PM (excluded from calculations)
- **Timezone**: America/Bogota
- **Holidays**: Colombian holidays fetched from external API
- **Approximation**: Non-working times adjusted to previous nearest business time

## 🛠️ Installation

```bash
# Clone the repository
git clone
cd FechasHabilesAPI

# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start

# Or run in development mode
npm run dev
```

## 📚 API Documentation

### Endpoint

```
GET /calculate-business-time
```

### Query Parameters

- `days` (optional): Number of business days to add (positive integer)
- `hours` (optional): Number of business hours to add (positive integer)  
- `date` (optional): Start date in UTC ISO 8601 format with Z suffix (e.g., `2025-08-01T14:00:00Z`)

**Note**: At least one parameter (`days` or `hours`) must be provided.

### Response Format

**Success (200 OK):**
```json
{
  "date": "2025-08-01T14:00:00.000Z"
}
```

**Error (400, 503, etc.):**
```json
{
  "error": "ErrorCode",
  "message": "Error description"
}
```

### Error Codes

- `InvalidParameters`: Missing or invalid parameters
- `InvalidDateFormat`: Date not in required ISO 8601 format
- `NegativeValues`: Negative values provided for days/hours
- `InternalError`: Unexpected server error

## 🌐 Example Usage

### Basic Examples

```bash
# Add 1 business day from current time
curl "http://localhost:3000/calculate-business-time?days=1"

# Add 3 business hours from current time
curl "http://localhost:3000/calculate-business-time?hours=3"

# Add both days and hours from specific date
curl "http://localhost:3000/calculate-business-time?days=1&hours=2&date=2025-08-01T10:00:00Z"
```

### Real-world Scenarios

1. **Friday 5 PM + 1 hour → Monday 9 AM**
```bash
curl "http://localhost:3000/calculate-business-time?hours=1&date=2025-08-01T22:00:00Z"
# Result: Monday at 14:00:00Z (9 AM Colombia time)
```

2. **Weekend + 1 hour → Monday 9 AM**
```bash
curl "http://localhost:3000/calculate-business-time?hours=1&date=2025-08-02T19:00:00Z"
# Result: Monday at 14:00:00Z (9 AM Colombia time)
```

3. **Business day 8 AM + 8 hours → Same day 5 PM**
```bash
curl "http://localhost:3000/calculate-business-time?hours=8&date=2025-08-04T13:00:00Z"
# Result: Same day at 22:00:00Z (5 PM Colombia time)
```

4. **Holiday handling**
```bash
curl "http://localhost:3000/calculate-business-time?days=5&hours=4&date=2025-04-10T20:00:00Z"
# Skips April 17-18 holidays, results in April 21
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test businessTime.test.ts
```

## 🔧 Development

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Development server with hot reload
npm run dev
```

## 📊 Health Monitoring

```bash
# Health check endpoint
curl "http://localhost:3000/health"

# Response
{
  "status": "OK",
  "timestamp": "2025-01-XX:XX:XX.XXXZ"
}
```

## 🚦 Production Deployment

### Environment Variables

```bash
PORT=3000  # Server port (optional, defaults to 3000)
```

### Build and Deploy

```bash
# Production build
npm run build

# Start production server
npm start
```

