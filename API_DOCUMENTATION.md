# Delphi App API Documentation

## Base URL
```
http://localhost:3000/api
```

## People API

### List People
Retrieves a paginated list of people with optional search functionality.

```http
GET /people
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term for filtering results

**Response Example:**
```json
{
  "data": [
    {
      "person_id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### Create Person
Creates a new person record.

```http
POST /people
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com"
}
```

**Required Fields:**
- `first_name`
- `last_name`
- `email`

**Response Example:**
```json
{
  "person_id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com"
}
```

### Get Single Person
Retrieves details for a specific person.

```http
GET /people/{id}
```

**Response Example:**
```json
{
  "person_id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com"
}
```

### Update Person
Updates a person's basic information.

```http
PUT /people/{id}
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com"
}
```

**Required Fields:**
- `first_name`
- `last_name`
- `email`

**Response Example:**
```json
{
  "person_id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com"
}
```

### Delete Person
Deletes a person and their associated details.

```http
DELETE /people/{id}
```

**Response Example:**
```json
{
  "message": "Person deleted successfully"
}
```

## People Details API

### Get Person Details
Retrieves custom details for a specific person.

```http
GET /people-details/{id}
```

**Response Example:**
```json
{
  "person_id": 1,
  "department": "Engineering",
  "position": "Software Engineer",
  "start_date": "2023-01-01",
  "notes": "Full stack developer",
  "updated_at": "2023-12-25T10:30:00Z",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com"
}
```

### Update Person Details
Updates or creates custom details for a person.

```http
PUT /people-details/{id}
```

**Request Body:**
```json
{
  "department": "Engineering",
  "position": "Software Engineer",
  "start_date": "2023-01-01",
  "notes": "Full stack developer"
}
```

**Fields:**
- `department` (optional)
- `position` (optional)
- `start_date` (optional): ISO date format (YYYY-MM-DD)
- `notes` (optional)

**Response Example:**
```json
{
  "person_id": 1,
  "department": "Engineering",
  "position": "Software Engineer",
  "start_date": "2023-01-01",
  "notes": "Full stack developer",
  "updated_at": "2023-12-25T10:30:00Z"
}
```

### Delete Person Details
Deletes custom details for a person.

```http
DELETE /people-details/{id}
```

**Response Example:**
```json
{
  "message": "Details deleted successfully"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "First name, last name, and email are required"
}
```

### 404 Not Found
```json
{
  "error": "Person not found"
}
```
or
```json
{
  "error": "Details not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Error message details"
}
```

## Notes

1. All endpoints return JSON responses
2. Dates are in ISO format (YYYY-MM-DD)
3. Timestamps are in ISO 8601 format
4. The `people-details` endpoints manage custom fields only
5. The `people` endpoints manage core person data
6. Deleting a person will automatically delete their details due to foreign key constraints 