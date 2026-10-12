# CRM Sales Engine API

A backend CRM application for managing sales pipelines, team hierarchy, customer relationships, and activity tracking. The system supports user management, lead qualification, customer conversion, deal tracking, and audit history using MongoDB and Express.

The API is built as a backend-only service and exposes Swagger-based documentation at `/api-docs`.

## Technologies used

- Node.js 20+
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing
- Joi for validation
- Swagger UI / Swagger JSDoc for API docs
- dotenv for environment configuration
- Helmet and CORS for HTTP hardening
- express-rate-limit for login and registration

## Installation steps

1. Clone the repository.
2. Ensure Node.js 20+ and MongoDB are installed and running.
3. Install dependencies:

```bash
npm install
```

4. Copy the example environment file:

```bash
copy .env.example .env
```

5. Update the environment variables in `.env`.
6. Create the initial administrator user:

```bash
npm run create-admin
```

7. Start the server in development mode:

```bash
npm run dev
```

## Environment variables

The application expects the following variables in `.env`:

```env
PORT=
MONGO_URI=
DB_NAME=
SWAGGER_HOST=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=
JWT_REFRESH_EXPIRES_IN=
BOOTSTRAP_ADMIN_NAME=
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PHONE=
BOOTSTRAP_ADMIN_PASSWORD=
CORS_ORIGINS=
```

Notes:

- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be different and at least 32 characters long.
- `BOOTSTRAP_ADMIN_*` values are only used once to create the initial admin account.
- After successful bootstrap, remove or clear the bootstrap password from the environment if you no longer need it.

## Database setup

MongoDB is the primary data store. The app uses Mongoose models for:

- User
- Lead
- Customer
- Deal
- Activity
- Timeline

Important database setup requirements:

- MongoDB must be reachable via `MONGO_URI`.
- The app connects to the database named by `DB_NAME`.
- Because several workflows write audit history in a transaction, MongoDB should be configured as a replica set or sharded cluster in production. Standalone MongoDB does not support transaction-safe writes consistently.
- The application uses unique indexes, foreign-key-like references by ObjectId, and lookup indexes for assignment, status, filtering, and timeline access.

## How to run the server

After installation and environment configuration, start the app:

```bash
npm run dev
```

The server starts on the configured `PORT` (default: `3000` unless overridden in `.env`).

Main endpoints:

- API base: `/api`
- Swagger docs: `/api-docs`
- Health check root endpoint: `/`

## Authentication mechanism

Authentication is implemented using JWT tokens:

- Access tokens are short-lived and used for authenticated requests.
- Refresh tokens are longer-lived and used to rotate sessions.
- Tokens are sent in the `Authorization` header using the Bearer scheme.

Example:

```http
Authorization: Bearer <access_token>
```

Security behavior:

- passwords are hashed with bcrypt using a work factor of 12
- refresh tokens are stored as SHA-256 hashes instead of plaintext values
- logout invalidates the current token version
- a user’s `tokenVersion` is checked during access validation
- inactive users cannot authenticate
- public registration always creates a `SALES_EXECUTIVE` account; clients cannot choose privileged roles during public signup

## User roles and permissions

The system defines three main roles:

### ADMIN

- can manage all users
- can create privileged user accounts
- can activate or deactivate users
- can delete users under strict conditions
- can view all leads, customers, deals, and activities
- can delete leads and customers when business rules allow

### SALES_MANAGER

- can supervise sales executives
- can access leads assigned to their team
- can assign or reassign lead ownership for direct reports
- can manage activities for themselves and their team
- has limited ability to modify team-related data based on business rules

### SALES_EXECUTIVE

- can manage their own leads, customers, deals, and activities
- can access records assigned to them
- can create activities and update their own work
- cannot change assignment ownership without manager/admin authority

Role checks are enforced on the server using authorization middleware. Inactive users cannot access protected routes.

## API documentation

Swagger documentation is available at:

```text
http://localhost:<PORT>/api-docs
```

The API is organized around the following main resources:

- `/api/auth` — login, registration, token refresh, logout, and current user profile
- `/api/users` — user management and profile-related operations
- `/api/leads` — lead creation, assignment, search, conversion, and timeline
- `/api/customers` — customer records and related access rules
- `/api/deals` — deal lifecycle management and stage transitions
- `/api/activities` — sales task and follow-up tracking
- `/api/analytics` — reporting and aggregate analytics endpoints

## Important business rules

These rules are enforced server-side and are important for correct CRM behavior:

- Only qualified leads can be converted into customers and deals.
- A lead can only be converted once.
- A customer is uniquely tied to a lead via `originalLead`.
- A deal is unique per lead.
- Deal probability is validated between 0 and 100.
- Deal amounts must be greater than zero.
- Expected revenue is calculated from `amount * probability / 100`.
- Closed deals are terminal in status and stage logic.
- A won deal is assigned 100% probability; a lost deal is assigned 0% probability and requires a reason.
- Open deals cannot have a close date in the past.
- Customer reassignment automatically updates the original lead and related deals.
- Delete operations are intentionally restricted when references still exist.
- Activities may be assigned to users only when they are active and authorized for the given access model.
- Timeline events record important audit changes such as lead status changes, conversions, assignments, customer updates, and deal progress.

## Database/indexing decisions

The app uses MongoDB indexes

Examples of important indexing choices include:

- `User`: role + status + createdAt
- `Lead`: assignedExecutive + createdAt and status/source/priority + createdAt
- `Customer`: assignedExecutive + createdAt
- `Deal`: customer + createdAt, lead unique index, assignedExecutive + stage + expectedCloseDate

These indexes balance common list/search queries with the need to preserve relational integrity and support fast access to team-specific data.

## Assumptions made

This project assumes the following:

- MongoDB is the source of truth for the CRM domain model.
- The team uses a direct manager hierarchy (`manager` on the user record) for sales management.
- All business rules are enforced on the server, not only by client-side validation.
- The API is consumed by a trusted frontend or internal client and is not a public-facing open API without authentication.
- Transactional writes are required for critical audit and conversion operations, so a replica set is expected in production.
- The application is designed for a single CRM domain rather than a multi-tenant SaaS platform.

## Security and operational notes

- Configure CORS carefully before production deployment.
- Use strong, unique JWT secrets in a secure environment.
- Keep MongoDB credentials and sensitive env values out of source control.
- Validate that users are active before allowing session creation.
- Centralize logging and monitoring for unexpected database and validation failures.
