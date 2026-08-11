# NARSS Research Dashboard API Backend Documentation

This document provides a comprehensive specification of all REST API routes, controllers, database models, request requirements, response payloads, and database capability constraints for the NARSS Research Dashboard Backend.

---

## Table of Contents
1. [Architecture & Global Configurations](#architecture--global-configurations)
2. [Global Error Payload Specifications](#global-error-payload-specifications)
3. [Database Models & Schema Definition](#database-models--schema-definition)
   - [User Model](#1-user-model)
   - [Project Model](#2-project-model)
   - [Expense Model](#3-expense-model)
   - [Document Model](#4-document-model)
   - [Publication Model](#5-publication-model)
4. [API Endpoints Reference](#api-endpoints-reference)
   - [Health Check API](#1-health-check-api)
   - [Authentication & User Management API](#2-authentication--user-management-api)
   - [Dashboard Analytics API](#3-dashboard-analytics-api)
   - [Project Management API](#4-project-management-api)
   - [Expense & Budget Tracking API](#5-expense--budget-tracking-api)
   - [Document Management & Versioning API](#6-document-management--versioning-api)
   - [Research Outputs & Publications API](#7-research-outputs--publications-api)

---

## Architecture & Global Configurations

- **Base URL Context**: `/api` (e.g., `http://localhost:5000/api`)
- **Port**: Default port is determined by `process.env.PORT` or `5000`.
- **CORS Configuration**: Supports cross-origin resource sharing from any origin (`*`) with methods `GET, POST, PUT, DELETE, PATCH, OPTIONS` and headers `Content-Type, Authorization`.
- **Static Assets Host**: Uploaded receipts and document versions are hosted statically under the `/uploads` path (mapping to the directory defined by `process.env.UPLOAD_PATH` or `./uploads`).
- **Authentication**: Stateless authentication using JSON Web Tokens (JWT).
  - **Access Token**: Validated via `Authorization: Bearer <token>` (HMAC SHA-256).
  - **Refresh Token**: Validated via custom payload on token refresh endpoint.
- **Roles & Permissions Hierarchy**:
  - `Admin`: Full system access, bypasses owner restrictions, is authorized to delete projects, expenses, documents, and publications.
  - `Manager`: High-level operations, create/update projects, manage members, milestones, expenses, documents, and publications. Cannot delete projects.
  - `Researcher`: Project-level access. Can view assigned/owned projects, upload documents, register outputs, and log expenses. Cannot delete other records or manage projects they aren't part of.
  - `External Partner`: Guest researcher access. Limited to viewing assigned projects where they are team members.

---

## Global Error Payload Specifications

All errors are channeled through the global error handling middleware `server/middlewares/errorMiddleware.js`.
Errors have a consistent JSON signature.

### Standard Error Response Schema (400 / 401 / 403 / 404 / 500)
```json
{
  "success": false,
  "message": "Error description string detailing the failure",
  "stack": "Stack trace string (only returned in development environment; null in production)"
}
```

### Specific Exception Status Mappings:
1. **Invalid JSON / Body Schema (Joi validation failure)**: Status `400 Bad Request`.
2. **Mongoose CastError (Bad ObjectId hex)**: Status `404 Not Found` with message `"Resource not found with specified ID"`.
3. **Mongoose Duplicate Key Error (Code 11000)**: Status `400 Bad Request` with message `"Duplicate field value entered: {field}. Please use another value."`.
4. **Mongoose Schema ValidationError**: Status `400 Bad Request` with comma-separated list of schema validation error messages.
5. **JWT JsonWebTokenError (Signature/Tamper)**: Status `401 Unauthorized` with message `"Invalid authentication token"`.
6. **JWT TokenExpiredError**: Status `401 Unauthorized` with message `"Authentication token expired"`.
7. **Unauthenticated Request (Missing header/token)**: Status `401 Unauthorized` with message `"Not authorized, no token provided"`.
8. **Missing Route**: Status `404 Not Found` with message `"Route Not Found - {route_path}"`.

---

## Database Models & Schema Definition

### 1. User Model
Defines the actors within the dashboard system.

- **Collection Name**: `users`
- **Fields**:
  - `name` (String): Required, trimmed, minimum 2 characters.
  - `email` (String): Required, unique, lowercase, trimmed, validated via RFC email regex pattern.
  - `password` (String): Required, minimum 6 characters. Hidden from query selections by default (`select: false`).
  - `role` (String): Enum: `['Admin', 'Manager', 'Researcher', 'External Partner']`. Defaults to `'Researcher'`.
  - `resetPasswordToken` (String): Optional hash of reset password token.
  - `resetPasswordExpire` (Date): Optional expiration timestamp for reset token.
  - `createdAt` / `updatedAt` (Date): Auto-generated timestamps.

---

### 2. Project Model
Main container for tracking collaborative scientific research.

- **Collection Name**: `projects`
- **Sub-Schemas**:
  - **TeamMemberSchema** (`{ _id: false }`):
    - `user` (Mongoose ObjectId -> `User` model): Required.
    - `role` (String): Enum: `['Lead', 'Researcher', 'Advisor', 'Contributor']`. Defaults to `'Researcher'`.
  - **MilestoneSchema** (Auto-stamps):
    - `title` (String): Required, trimmed.
    - `deadline` (Date): Required.
    - `status` (String): Enum: `['Pending', 'In Progress', 'Completed']`. Defaults to `'Pending'`.
    - `completedAt` (Date): Optional date marking actual milestone closure.
- **Fields**:
  - `title` (String): Required, trimmed.
  - `description` (String): Required.
  - `startDate` (Date): Required.
  - `endDate` (Date): Required. Must be greater than or equal to `startDate` (enforced via Joi validation).
  - `budget` (Number): Required, non-negative.
  - `pi` (Mongoose ObjectId -> `User` model): Required. Principal Investigator leading the project.
  - `fundingSource` (String): Trimmed, defaults to `'Internal Funding'`.
  - `status` (String): Enum: `['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled']`. Defaults to `'Planning'`.
  - `teamMembers` (Array of `TeamMemberSchema`): Optional.
  - `milestones` (Array of `MilestoneSchema`): Optional.
  - `createdAt` / `updatedAt` (Date): Auto-generated timestamps.

---

### 3. Expense Model
Tracks project-related financial disbursements and matching metadata.

- **Collection Name**: `expenses`
- **Fields**:
  - `project` (Mongoose ObjectId -> `Project` model): Required.
  - `category` (String): Required, Enum: `['Personnel', 'Equipment', 'Travel', 'Subcontracting', 'Supplies', 'Overhead', 'Other']`.
  - `amount` (Number): Required, non-negative.
  - `date` (Date): Required, defaults to `Date.now`.
  - `description` (String): Trimmed.
  - `receiptUrl` (String): Optional static endpoint path to the receipt attachment file, defaults to `null`.
  - `receiptName` (String): Optional original name of uploaded receipt document, defaults to `null`.
  - `status` (String): Enum: `['Pending', 'Approved', 'Rejected']`. Defaults to `'Pending'`.
  - `createdBy` (Mongoose ObjectId -> `User` model): Required. User logging the expense.
  - `createdAt` / `updatedAt` (Date): Auto-generated timestamps.

---

### 4. Document Model
Stores document metadata, system pathways, and full historical modifications for audit compliance.

- **Collection Name**: `documents`
- **Sub-Schemas**:
  - **DocumentVersionSchema** (`{ _id: false }`):
    - `versionNumber` (Number): Required.
    - `filePath` (String): Required.
    - `fileName` (String): Optional.
    - `fileSize` (Number): Optional.
    - `uploadedBy` (Mongoose ObjectId -> `User` model): Required.
    - `uploadedAt` (Date): Required, defaults to `Date.now`.
- **Fields**:
  - `project` (Mongoose ObjectId -> `Project` model): Required.
  - `fileName` (String): Required, trimmed.
  - `filePath` (String): Required active file system or media cloud path.
  - `fileSize` (Number): Optional size in bytes.
  - `mimeType` (String): Optional standard internet media type string.
  - `category` (String): Enum: `['Contract', 'Proposal', 'Report', 'Ethics', 'Financial', 'Data', 'Other']`. Defaults to `'Report'`.
  - `versionNumber` (Number): Defaults to `1`. Active revision marker.
  - `versionHistory` (Array of `DocumentVersionSchema`): Stores previous configurations.
  - `uploadedBy` (Mongoose ObjectId -> `User` model): Required. Active editor.
  - `createdAt` / `updatedAt` (Date): Auto-generated timestamps.

---

### 5. Publication Model
Maintains details for research articles, dataset sets, patents, and scientific software outputs.

- **Collection Name**: `publications`
- **Fields**:
  - `project` (Mongoose ObjectId -> `Project` model): Required.
  - `outputType` (String): Required, Enum: `['Publication', 'Patent', 'Dataset', 'Conference Paper', 'Book Chapter', 'Software']`.
  - `title` (String): Required, trimmed.
  - `authors` (Array of String): Trimmed string collection of scientists.
  - `externalIdentifiers` (Nested Sub-Object):
    - `doi` (String): Trimmed, defaults to `""`.
    - `scopusId` (String): Trimmed, defaults to `""`.
    - `orcid` (String): Trimmed, defaults to `""`.
    - `isbn` (String): Trimmed, defaults to `""`.
  - `links` (Array of String): Trimmed url endpoints.
  - `publicationDate` (Date): Optional.
  - `journalOrPublisher` (String): Trimmed.
  - `status` (String): Enum: `['Draft', 'Submitted', 'Under Review', 'Published', 'Granted']`. Defaults to `'Published'`.
  - `createdBy` (Mongoose ObjectId -> `User` model): Required.
  - `createdAt` / `updatedAt` (Date): Auto-generated timestamps.

---

## API Endpoints Reference

### 1. Health Check API

#### `GET /api/health`
- **Purpose**: Verify backend status, middleware integration, and current node time.
- **Access Level**: Public (No Authentication required).
- **Request Requirements**: None.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "NARSS Research Dashboard API Backend is operational",
    "timestamp": "2026-08-07T12:34:56.789Z"
  }
  ```
- **Database Capabilities**:
  - **Operations**: None. Bypass database entirely.

---

### 2. Authentication & User Management API

#### `POST /api/auth/register` (Alias: `POST /api/auth/signup`)
- **Purpose**: Sign up a new user account, encrypt password, and issue active JWT access and refresh tokens.
- **Access Level**: Public.
- **Request Requirements**:
  - **Headers**: `Content-Type: application/json`
  - **Body Fields**:
    | Field Name | Data Type | Requirement | Constraints / Details |
    | :--- | :--- | :--- | :--- |
    | `name` | String | Required | Minimum 2, maximum 100 characters. Can also be submitted as `fullName`. |
    | `email` | String | Required | Valid RFC email pattern. Unique across database (case-insensitive conversion applied). |
    | `password` | String | Required | Minimum 6, maximum 64 characters. Hashed before storage. |
    | `role` | String | Optional | Enum: `['Admin', 'Manager', 'Researcher', 'External Partner']`. Defaults to `'Researcher'`. |
- **Success Response (210 Created)**:
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "603d2b78f1a23c4567890abc",
      "name": "Jane Doe",
      "email": "janedoe@example.com",
      "role": "Researcher"
    }
  }
  ```
- **Error States**:
  - `400 Bad Request`: Joi schema violation or user already exists.
    ```json
    { "success": false, "message": "User already exists with this email address" }
    ```
- **Database Capabilities**:
  - **Checks**: Queries collection using `{ email: lowercaseEmail }`.
  - **Writes**: Automatically encrypts password using `bcryptjs` with salt round 10 in a pre-save mongoose hook. Inserts one new User document. Supports unique indexing constraint on the MongoDB collection.

#### `POST /api/auth/login`
- **Purpose**: Validate user credentials and return authenticated tokens.
- **Access Level**: Public.
- **Request Requirements**:
  - **Headers**: `Content-Type: application/json`
  - **Body Fields**:
    | Field Name | Data Type | Requirement | Constraints |
    | :--- | :--- | :--- | :--- |
    | `email` | String | Required | Valid email. Case-insensitive lookup. |
    | `password` | String | Required | Cleartext password. |
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "603d2b78f1a23c4567890abc",
      "name": "Jane Doe",
      "email": "janedoe@example.com",
      "role": "Researcher"
    }
  }
  ```
- **Error States**:
  - `400 Bad Request`: Body schema validation failed.
  - `401 Unauthorized`: Invalid credentials.
    ```json
    { "success": false, "message": "Invalid email or password" }
    ```
- **Database Capabilities**:
  - **Operations**: Finds user by lowercased email, explicitly selecting the `+password` field (which is normally hidden). Compares utilizing standard schema method `matchPassword`.

#### `POST /api/auth/refresh`
- **Purpose**: Authenticate refresh token and issue a clean pair of access and refresh tokens.
- **Access Level**: Public.
- **Request Requirements**:
  - **Headers**: `Content-Type: application/json`
  - **Body Fields**:
    | Field Name | Data Type | Requirement | Constraints |
    | :--- | :--- | :--- | :--- |
    | `refreshToken` | String | Required | Valid JWT refresh token containing User ID. |
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "NEW_ACCESS_JWT_TOKEN",
    "accessToken": "NEW_ACCESS_JWT_TOKEN",
    "refreshToken": "NEW_REFRESH_JWT_TOKEN"
  }
  ```
- **Error States**:
  - `400 Bad Request`: Missing refresh token body.
  - `401 Unauthorized`: Expired, forged token, or user deleted from the system.
    ```json
    { "success": false, "message": "Invalid or expired refresh token" }
    ```
- **Database Capabilities**:
  - **Operations**: Decodes JWT against `JWT_REFRESH_SECRET`, queries database by ID (`User.findById(decoded.id)`) to verify existence, and generates fresh tokens.

#### `POST /api/auth/forgot-password`
- **Purpose**: Create a temporary password reset token valid for 10 minutes.
- **Access Level**: Public.
- **Request Requirements**:
  - **Headers**: `Content-Type: application/json`
  - **Body Fields**:
    | Field Name | Data Type | Requirement | Constraints |
    | :--- | :--- | :--- | :--- |
    | `email` | String | Required | Registered user email. |
- **Success Response (200 OK)**:
  *Success response is always generated even if the email does not exist to block account harvesting/enumeration.*
  - **Case A: Email exists (Returns cleartext resetToken directly for developer convenience in this sandbox environment)**:
    ```json
    {
      "success": true,
      "message": "Password reset token generated successfully",
      "resetToken": "f784e2a149170e7e1c1db0fae5cbdecf906a5e1d"
    }
    ```
  - **Case B: Email does not exist (Generic message)**:
    ```json
    {
      "success": true,
      "message": "If that email address is registered, a password reset token has been issued."
    }
    ```
- **Error States**:
  - `400 Bad Request`: Body email string missing.
- **Database Capabilities**:
  - **Operations**: Searches user via lowercase email. Generates random 20-byte unhashed hex token. Hashes token using `sha256` in-memory. Writes hashed token to `resetPasswordToken` and adds current timestamp + 10 minutes to `resetPasswordExpire`. Saves document utilizing `{ validateBeforeSave: false }` option to bypass schema validators (e.g. password validation) during reset initiation.

#### `POST /api/auth/reset-password`
- **Purpose**: Reset user's active password using reset token.
- **Access Level**: Public.
- **Request Requirements**:
  - **Headers**: `Content-Type: application/json`
  - **Body Fields**:
    | Field Name | Data Type | Requirement | Constraints |
    | :--- | :--- | :--- | :--- |
    | `resetToken` | String | Required | Cleartext 40-character hex reset token generated during request. |
    | `newPassword`| String | Required | Minimum 6 characters. |
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Password updated successfully. You may now log in with your new password."
  }
  ```
- **Error States**:
  - `400 Bad Request`: Missing token/password parameters or invalid/expired token.
    ```json
    { "success": false, "message": "Invalid or expired reset token" }
    ```
- **Database Capabilities**:
  - **Operations**: Hashes provided token with `sha256`, runs query: `User.findOne({ resetPasswordToken: hashedToken, resetPasswordExpire: { $gt: Date.now() } })`. Replaces `password` with the new plain text, unsets token fields, and triggers the pre-save password-hashing middleware block.

#### `GET /api/auth/me`
- **Purpose**: Retrieve active user profile data.
- **Access Level**: Private (Authenticated).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "603d2b78f1a23c4567890abc",
      "name": "Jane Doe",
      "email": "janedoe@example.com",
      "role": "Researcher",
      "createdAt": "2026-08-01T10:00:00.000Z"
    }
  }
  ```
- **Error States**:
  - `401 Unauthorized`: Token expired or user record deleted.

---

### 3. Dashboard Analytics API

#### `GET /api/dashboard/stats`
- **Purpose**: Consolidated high-level statistical KPIs and chart series data across Projects, Milestones, Expenses, Documents, and Publications.
- **Access Level**: Private (Authenticated).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "projects": {
        "total": 15,
        "active": 6,
        "completed": 4,
        "planning": 3,
        "onHold": 2
      },
      "milestones": {
        "total": 24,
        "completed": 10,
        "inProgress": 8,
        "pending": 6,
        "completionRate": 41.67
      },
      "finances": {
        "overallBudget": 2400000,
        "overallSpent": 650000,
        "remainingBudget": 1750000,
        "utilizationPercentage": 27.08
      },
      "outputs": {
        "total": 12,
        "breakdown": {
          "Publication": 8,
          "Patent": 1,
          "Dataset": 3
        }
      },
      "documents": {
        "total": 45
      },
      "chartProjectData": [
        {
          "id": "603d2b78f1a23c4567890abc",
          "title": "Smart Satellite Data Processing",
          "budget": 500000,
          "spent": 120000,
          "utilizationPercentage": "24.0"
        }
        /* Top 5 projects */
      ]
    }
  }
  ```
- **Database Capabilities & Performance Bottlenecks**:
  - **Operations**:
    - Project counter operations.
    - Aggregates milestones status across all project lists: `$unwind: '$milestones'` then `$group` on `milestones.status`.
    - Total project budgets compiled using `$sum`.
    - Compiles global expense spends using `$match` for `status: "Approved"` and `$sum: "$amount"`.
    - Publications classified via `$group: { _id: "$outputType", count: { $sum: 1 } }`.
    - Queries first 5 projects using `Project.find().select('title budget status').limit(5)`. For each of those, runs a sub-aggregation query to sum matching `Approved` expenses in JavaScript utilizing `Promise.all`.
  - **Limitations / Impossible Operations**:
    - Hardcoded `.limit(5)` limit on chart data cannot be customized or sorted differently.
    - Highly serial queries inside `Promise.all` trigger multiple sub-aggregations on MongoDB, which introduces overhead as projects scale. Relational joining is simulated via sequential application logic queries, not a native `$lookup`.

---

### 4. Project Management API

#### `GET /api/projects`
- **Purpose**: Get list of projects. Automatically filters list by ownership / assignment for restricted roles.
- **Access Level**: Private (Authenticated).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  - **Query Parameters**:
    | Parameter | Data Type | Requirement | Constraints / Purpose |
    | :--- | :--- | :--- | :--- |
    | `status` | String | Optional | Enum: `Planning`, `Active`, `On Hold`, `Completed`, `Cancelled`. |
    | `search` | String | Optional | Case-insensitive regex substring search of project title. |
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 1,
    "projects": [
      {
        "_id": "603d2b78f1a23c4567890abc",
        "title": "Smart Satellite Data Processing",
        "description": "Satellite deep learning project",
        "startDate": "2026-01-01T00:00:00.000Z",
        "endDate": "2026-12-31T00:00:00.000Z",
        "budget": 500000,
        "pi": {
          "_id": "603d2b78f1a23c4567890def",
          "name": "Dr. Sarah Connor",
          "email": "sarah@example.com",
          "role": "Researcher"
        },
        "fundingSource": "Internal Funding",
        "status": "Active",
        "teamMembers": [
          {
            "user": {
              "_id": "603d2b78f1a23c4567890xyz",
              "name": "Alex Mercer",
              "email": "alex@example.com",
              "role": "Researcher"
            },
            "role": "Researcher"
          }
        ],
        "milestones": [],
        "createdAt": "2026-01-01T08:00:00.000Z",
        "updatedAt": "2026-01-01T08:00:00.000Z"
      }
    ]
  }
  ```
- **Database Capabilities**:
  - **Role Filtering (Business Logic)**:
    - If user is `Researcher` or `External Partner`, they can *only* see projects where they are either the Principal Investigator (PI) (`pi === user.id`) OR a registered team member (`teamMembers.user === user.id`).
    - Admin & Manager bypass this constraint and can query all projects.
  - **Populations**: Automatically joins and returns `pi` and `teamMembers.user` sub-documents.
  - **Sorting**: Hardcoded to created date descending (`sort({ createdAt: -1 })`).
  - **Limitations / Impossible Operations**:
    - No pagination (`page`, `limit`) capability.
    - No budget-range filter.
    - Search is restricted exclusively to the `title` field; the description and other fields cannot be searched.

#### `GET /api/projects/:id`
- **Purpose**: Get specific project details.
- **Access Level**: Private (Authenticated).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  - **URL Params**: `id` (Project ID, required).
- **Success Response (200 OK)**:
  Returns full populated Project document.
- **Error States**:
  - `403 Forbidden`: Authenticated user is `Researcher` or `External Partner` but has no PI or team member affiliation with this project.
    ```json
    { "success": false, "message": "Not authorized to access this project" }
    ```
  - `404 Not Found`: Project not found.

#### `POST /api/projects`
- **Purpose**: Register a new research project.
- **Access Level**: Private (Admin or Manager roles only).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`, `Content-Type: application/json`
  - **Body Fields**:
    | Field Name | Data Type | Requirement | Constraints |
    | :--- | :--- | :--- | :--- |
    | `title` | String | Required | Project title |
    | `description` | String | Required | Long form description |
    | `startDate` | Date | Required | Launch date |
    | `endDate` | Date | Required | Minimum value must be `>= startDate` |
    | `budget` | Number | Required | Must be `>= 0` |
    | `pi` | String | Optional | 24-character hex ObjectId of the principal investigator. Defaults to current user. |
    | `fundingSource` | String | Optional | Defaults to `'Internal Funding'`. |
    | `status` | String | Optional | Enum: `Planning`, `Active`, `On Hold`, `Completed`, `Cancelled`. Defaults to `'Planning'`. |
    | `teamMembers` | Array | Optional | Elements match `{ user: string, role: string }` |
    | `milestones` | Array | Optional | Elements match `{ title: string, deadline: date, status: string }` |
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Project created successfully",
    "project": { ... }
  }
  ```
- **Error States**:
  - `400 Bad Request`: Validation failure (e.g. Budget < 0, EndDate before StartDate).
  - `403 Forbidden`: Researcher/External Partner attempts access.

#### `PUT /api/projects/:id`
- **Purpose**: Modify project fields.
- **Access Level**: Private (Admin, Manager, or project PI only).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`, `Content-Type: application/json`
  - **URL Params**: `id` (Project ID, required).
  - **Body Fields**: Any subset of the Project schema fields.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Project updated successfully",
    "project": { ... }
  }
  ```
- **Error States**:
  - `403 Forbidden`: Authenticated user is not Admin/Manager, and is not the Principal Investigator of the project.
    ```json
    { "success": false, "message": "Not authorized to update project" }
    ```

#### `DELETE /api/projects/:id`
- **Purpose**: Permanently remove a project and all associated configurations.
- **Access Level**: Private (Admin role only).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  - **URL Params**: `id` (Project ID, required).
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Project deleted successfully"
  }
  ```
- **Error States**:
  - `403 Forbidden`: Attempted by Manager, Researcher, or External Partner.
  - `404 Not Found`: Project not found.

#### `POST /api/projects/:id/members`
- **Purpose**: Add a user to the project's collaborator list.
- **Access Level**: Private (Admin, Manager, or project PI only).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`, `Content-Type: application/json`
  - **URL Params**: `id` (Project ID, required).
  - **Body Fields**:
    | Field Name | Data Type | Requirement | Constraints |
    | :--- | :--- | :--- | :--- |
    | `userId` | String | Required | 24-character hex ObjectId of an existing user. |
    | `role` | String | Optional | Enum: `Lead`, `Researcher`, `Advisor`, `Contributor`. Defaults to `'Researcher'`. |
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Team member added successfully",
    "teamMembers": [
      {
        "user": {
          "_id": "603d2b78f1a23c4567890xyz",
          "name": "Alex Mercer",
          "email": "alex@example.com",
          "role": "Researcher"
        },
        "role": "Researcher"
      }
    ]
  }
  ```
- **Error States**:
  - `400 Bad Request`: User is already registered as a member on this project.
  - `404 Not Found`: Project or target User not found in database.

#### `DELETE /api/projects/:id/members/:userId`
- **Purpose**: Revoke a user's membership in a project.
- **Access Level**: Private (Admin, Manager, or project PI only).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  - **URL Params**:
    - `id` (Project ID, required).
    - `userId` (User ID, required).
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Team member removed successfully",
    "teamMembers": [ /* Remaining members list */ ]
  }
  ```

#### `POST /api/projects/:id/milestones`
- **Purpose**: Insert a new milestone into the project.
- **Access Level**: Private (Admin, Manager, or project PI only).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`, `Content-Type: application/json`
  - **URL Params**: `id` (Project ID, required).
  - **Body Fields**:
    | Field Name | Data Type | Requirement | Constraints |
    | :--- | :--- | :--- | :--- |
    | `title` | String | Required | Milestone title. |
    | `deadline` | Date | Required | Due date. |
    | `status` | String | Optional | Enum: `Pending`, `In Progress`, `Completed`. Defaults to `'Pending'`. |
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Milestone added successfully",
    "milestones": [ ... ]
  }
  ```

#### `PUT /api/projects/:id/milestones/:milestoneId`
- **Purpose**: Update milestone title, deadline, or completion status.
- **Access Level**: Private (Any authenticated collaborator).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`, `Content-Type: application/json`
  - **URL Params**:
    - `id` (Project ID, required).
    - `milestoneId` (Milestone sub-document ID, required).
  - **Body Fields**: `title` (optional), `deadline` (optional), `status` (optional, enum).
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Milestone updated successfully",
    "milestone": {
      "_id": "603d2b78f1a23c4567890mil",
      "title": "Phase 1 Complete",
      "deadline": "2026-06-30T00:00:00.000Z",
      "status": "Completed",
      "completedAt": "2026-08-07T12:00:00.000Z"
    }
  }
  ```
- **Database Capabilities**:
  - **Milestone Completion Tracking**: If updated milestone `status` is set to `"Completed"` and `completedAt` is not currently set, the controller automatically assigns the current server timestamp `new Date()` to `completedAt`.

#### `DELETE /api/projects/:id/milestones/:milestoneId`
- **Purpose**: Remove milestone from project.
- **Access Level**: Private (Admin, Manager, or project PI only).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  - **URL Params**:
    - `id` (Project ID, required).
    - `milestoneId` (Milestone sub-document ID, required).
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Milestone deleted successfully"
  }
  ```

---

### 5. Expense & Budget Tracking API

#### `GET /api/expenses`
- **Purpose**: Retrieve expense logs, filterable by project, category, and approval status.
- **Access Level**: Private (Authenticated).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  - **Query Parameters**:
    - `project` (Mongoose ObjectId, optional): Filter by associated project.
    - `category` (String, optional): Enum: `Personnel`, `Equipment`, `Travel`, `Subcontracting`, `Supplies`, `Overhead`, `Other`.
    - `status` (String, optional): Enum: `Pending`, `Approved`, `Rejected`.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 1,
    "expenses": [
      {
        "_id": "603d2b78f1a23c4567890ex1",
        "project": {
          "_id": "603d2b78f1a23c4567890abc",
          "title": "Smart Satellite Data Processing",
          "budget": 500000,
          "status": "Active"
        },
        "category": "Equipment",
        "amount": 25000,
        "date": "2026-08-01T12:00:00.000Z",
        "description": "High-perf GPU workstation",
        "receiptUrl": "/uploads/gpu_receipt_1623.pdf",
        "receiptName": "gpu_receipt.pdf",
        "status": "Approved",
        "createdBy": {
          "_id": "603d2b78f1a23c4567890def",
          "name": "Dr. Sarah Connor",
          "email": "sarah@example.com",
          "role": "Researcher"
        },
        "createdAt": "2026-08-01T12:00:00.000Z",
        "updatedAt": "2026-08-03T09:00:00.000Z"
      }
    ]
  }
  ```
- **Database Capabilities**:
  - **Populations**: Dynamically populates `project` (title, budget, status) and `createdBy` (name, email, role).
  - **Sorting**: Sorted by transaction date descending (`sort({ date: -1 })`).
  - **Limitations**: No pagination, no amount-range filtering.

#### `GET /api/expenses/summary`
- **Purpose**: Aggregate project-wise financial summary reports. Computes approved funds vs original allocations, pending spends, and category breakdowns.
- **Access Level**: Private (Authenticated).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  - **Query Parameters**:
    - `projectId` (Mongoose ObjectId, optional): Limits aggregation report to a single project.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "summary": [
      {
        "projectId": "603d2b78f1a23c4567890abc",
        "projectTitle": "Smart Satellite Data Processing",
        "status": "Active",
        "allocatedBudget": 500000,
        "totalSpent": 120000,
        "totalPending": 15000,
        "totalRejected": 5000,
        "remainingBudget": 380000,
        "utilizationPercentage": 24,
        "categoryBreakdown": [
          {
            "_id": "Equipment",
            "total": 100000
          },
          {
            "_id": "Travel",
            "total": 20000
          }
        ]
      }
    ]
  }
  ```
- **Database Capabilities & Aggregations**:
  - **Aggregation Loop**:
    - Queries project collection matching the optional filter.
    - Inside a Javascript mapping loop (`Promise.all`), executes a MongoDB aggregate pipeline on the `Expense` collection filtering by project:
      1. `$match: { project: p._id }` grouped by `$status` summing `amount` to extract `totalApproved`/`totalPending`/`totalRejected` funds. (Note: `totalSpent` is equivalent to approved expenses only).
      2. `$match: { project: p._id, status: 'Approved' }` grouped by `$category` to construct the `categoryBreakdown` array list.
  - **Limitations**: Triggers a sequence of distinct aggregation commands for each project, which scales at `O(N)` queries relative to project counts.

#### `GET /api/expenses/:id`
- **Purpose**: Get details of an expense record.
- **Access Level**: Private (Authenticated).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  - **URL Params**: `id` (Expense ID, required).
- **Success Response (200 OK)**:
  Returns full populated Expense document.

#### `POST /api/expenses`
- **Purpose**: Log a financial expense with an optional file receipt attachment.
- **Access Level**: Private (Authenticated).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`, `Content-Type: multipart/form-data`
  - **Body Payload (Multipart fields)**:
    | Field Name | Data Type | Requirement | Constraints / Purpose |
    | :--- | :--- | :--- | :--- |
    | `project` | String | Required | 24-character hex Project ObjectId. |
    | `category`| String | Required | Enum: `Personnel`, `Equipment`, `Travel`, `Subcontracting`, `Supplies`, `Overhead`, `Other`. |
    | `amount`  | Number/String | Required | Must be `>= 0` |
    | `date`    | Date | Optional | Defaults to current date. |
    | `description`| String | Optional | Trimmed description. |
    | `status`  | String | Optional | Enum: `Pending`, `Approved`, `Rejected`. Defaults to `'Pending'`. |
    | `receipt` | File (Binary) | Optional | Handled by file system upload middleware under the name `receipt`. |
- **Success Response (210 Created)**:
  ```json
  {
    "success": true,
    "message": "Expense logged successfully",
    "expense": {
      "_id": "603d2b78f1a23c4567890ex2",
      "project": {
        "_id": "603d2b78f1a23c4567890abc",
        "title": "Smart Satellite Data Processing",
        "budget": 500000
      },
      "category": "Travel",
      "amount": 1200,
      "date": "2026-08-07T00:00:00.000Z",
      "description": "Travel ticket",
      "receiptUrl": "/uploads/receipt-15982.png",
      "receiptName": "ticket.png",
      "status": "Pending",
      "createdBy": {
        "_id": "603d2b78f1a23c4567890def",
        "name": "Dr. Sarah Connor",
        "email": "sarah@example.com"
      },
      "createdAt": "2026-08-07T12:00:00.000Z"
    }
  }
  ```
- **Error States**:
  - `400 Bad Request`: Missing body components or negative amount.
  - `404 Not Found`: Linked Project not found.

#### `PUT /api/expenses/:id`
- **Purpose**: Update an expense record's fields or upload a new file receipt.
- **Access Level**: Private (Admin, Manager, or expense creator only).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`, optional `Content-Type: multipart/form-data`
  - **URL Params**: `id` (Expense ID, required).
  - **Body Payload / Files**: Any expense field or multipart `receipt` file.
- **Success Response (200 OK)**:
  Returns modified populated expense.

#### `DELETE /api/expenses/:id`
- **Purpose**: Permanently remove an expense record.
- **Access Level**: Private (Admin or Manager roles only).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  - **URL Params**: `id` (Expense ID, required).
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Expense log deleted successfully"
  }
  ```
- **Error States**:
  - `403 Forbidden`: Attempted by Researcher or External Partner.
  - `404 Not Found`: Record not found.

---

### 6. Document Management & Versioning API

#### `GET /api/documents`
- **Purpose**: Search, query, and filter documents.
- **Access Level**: Private (Authenticated).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  - **Query Parameters (All Optional)**:
    | Parameter | Data Type | Purpose / Pattern |
    | :--- | :--- | :--- |
    | `project` | String | Scopes query to specific 24-character hex Project ID. |
    | `category`| String | Enum: `Contract`, `Proposal`, `Report`, `Ethics`, `Financial`, `Data`, `Other`. |
    | `keyword` | String | Case-insensitive regex substring search of document filename. |
    | `startDate`| Date String | Filters uploads whose `createdAt` timestamp is `>= startDate`. |
    | `endDate`  | Date String | Filters uploads whose `createdAt` timestamp is `<= endDate`. |
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 1,
    "documents": [
      {
        "_id": "603d2b78f1a23c4567890doc1",
        "project": {
          "_id": "603d2b78f1a23c4567890abc",
          "title": "Smart Satellite Data Processing",
          "status": "Active"
        },
        "fileName": "satellite_design_v2.pdf",
        "filePath": "/uploads/satellite_design_v2_1821.pdf",
        "fileSize": 2048576,
        "mimeType": "application/pdf",
        "category": "Report",
        "versionNumber": 2,
        "versionHistory": [
          {
            "versionNumber": 1,
            "filePath": "/uploads/satellite_design_1623.pdf",
            "fileName": "satellite_design.pdf",
            "fileSize": 1048576,
            "uploadedBy": "603d2b78f1a23c4567890def",
            "uploadedAt": "2026-08-01T12:00:00.000Z"
          },
          {
            "versionNumber": 2,
            "filePath": "/uploads/satellite_design_v2_1821.pdf",
            "fileName": "satellite_design_v2.pdf",
            "fileSize": 2048576,
            "uploadedBy": "603d2b78f1a23c4567890def",
            "uploadedAt": "2026-08-05T09:00:00.000Z"
          }
        ],
        "uploadedBy": {
          "_id": "603d2b78f1a23c4567890def",
          "name": "Dr. Sarah Connor",
          "email": "sarah@example.com",
          "role": "Researcher"
        },
        "createdAt": "2026-08-01T12:00:00.000Z",
        "updatedAt": "2026-08-05T09:00:00.000Z"
      }
    ]
  }
  ```
- **Database Capabilities**:
  - **Operations**:
    - Keyword mapped to database pattern using `{ fileName: { $regex: keyword, $options: 'i' } }`.
    - Merges date ranges into a nested object filter: `query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) }`.
  - **Populations**: Populates `project` (title, status) and `uploadedBy` (name, email, role).
  - **Sorting**: Sorted by recent update date descending (`sort({ updatedAt: -1 })`).
  - **Limitations**: No full-text searches. Only metadata files can be searched. No pagination.

#### `GET /api/documents/:id`
- **Purpose**: Get detailed document metadata and its complete revision history.
- **Access Level**: Private (Authenticated).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  - **URL Params**: `id` (Document ID, required).
- **Success Response (200 OK)**:
  Returns full populated Document document, including nested user associations within `versionHistory.uploadedBy`.

#### `POST /api/documents`
- **Purpose**: Upload a new document. Automatically sets up Version 1.
- **Access Level**: Private (Authenticated).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`, `Content-Type: multipart/form-data`
  - **Body Payload (Multipart fields)**:
    | Field Name | Data Type | Requirement | Constraints |
    | :--- | :--- | :--- | :--- |
    | `project` | String | Required | 24-character hex Project ObjectId. |
    | `category`| String | Optional | Enum: `Contract`, `Proposal`, `Report`, `Ethics`, `Financial`, `Data`, `Other`. Defaults to `'Report'`. |
    | `file`     | File (Binary) | Required | Upload payload under field name `file`. |
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Document uploaded successfully",
    "document": { ... }
  }
  ```
- **Error States**:
  - `400 Bad Request`: Missing file payload or missing project ObjectId parameter.
  - `404 Not Found`: Project not found.

#### `POST /api/documents/:id/versions`
- **Purpose**: Upload a new version of an existing document. Increments `versionNumber`, updates active metadata, and adds a history record.
- **Access Level**: Private (Authenticated).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`, `Content-Type: multipart/form-data`
  - **URL Params**: `id` (Document ID, required).
  - **Body Payload (Multipart)**:
    - `file` (File Binary, required): Upload payload.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Document updated to Version 3",
    "document": { ... }
  }
  ```
- **Database Capabilities**:
  - **Operations**: Fetches active document. Increments `versionNumber = document.versionNumber + 1`. Pushes a new sub-document into `versionHistory` containing the file size, path, upload date, and active user ID. Updates active document reference paths.

#### `POST /api/documents/:id/revert/:versionNumber`
- **Purpose**: Revert active document fields to point back to an existing historical version.
- **Access Level**: Private (Authenticated).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  - **URL Params**:
    - `id` (Document ID, required).
    - `versionNumber` (Integer version number, required).
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Document reverted to Version 1",
    "document": { ... }
  }
  ```
- **Error States**:
  - `404 Not Found`: Document not found, or the specified version number was not found in `versionHistory` array.
- **Database Capabilities**:
  - **Operations**: Runs search in JS: `document.versionHistory.find(v => v.versionNumber === targetVersion)`. Copies historical `filePath`, `fileName`, and `fileSize` fields back into the main document body, updating active `versionNumber`. *No records are deleted from versionHistory during revert operations.*

#### `DELETE /api/documents/:id`
- **Purpose**: Delete a document and its entire version history.
- **Access Level**: Private (Admin or Manager roles only).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  - **URL Params**: `id` (Document ID, required).
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Document deleted successfully"
  }
  ```
- **Error States**:
  - `403 Forbidden`: Attempted by Researcher or External Partner.

---

### 7. Research Outputs & Publications API

#### `GET /api/publications`
- **Purpose**: Retrieve and search research outputs (publications, datasets, patents, conference papers).
- **Access Level**: Private (Authenticated).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  - **Query Parameters (All Optional)**:
    | Parameter | Data Type | Purpose / Description |
    | :--- | :--- | :--- |
    | `project` | String | Filter by 24-character hex Project ObjectId. |
    | `outputType`| String | Filter by output type enum: `Publication`, `Patent`, `Dataset`, `Conference Paper`, `Book Chapter`, `Software`. |
    | `status` | String | Filter by status enum: `Draft`, `Submitted`, `Under Review`, `Published`, `Granted`. |
    | `search` | String | Substring regex matching against `title`, `authors` or `journalOrPublisher`. |
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 1,
    "publications": [
      {
        "_id": "603d2b78f1a23c4567890pub1",
        "project": {
          "_id": "603d2b78f1a23c4567890abc",
          "title": "Smart Satellite Data Processing",
          "status": "Active"
        },
        "outputType": "Publication",
        "title": "Deep Neural Networks for Satellite Imagery",
        "authors": [
          "Dr. Sarah Connor",
          "Dr. Kyle Reese"
        ],
        "externalIdentifiers": {
          "doi": "10.1109/TGRS.2026.1234567",
          "scopusId": "",
          "orcid": "",
          "isbn": ""
        },
        "links": [
          "https://ieeexplore.ieee.org/document/1234567"
        ],
        "publicationDate": "2026-05-15T00:00:00.000Z",
        "journalOrPublisher": "IEEE Transactions on Geoscience",
        "status": "Published",
        "createdBy": {
          "_id": "603d2b78f1a23c4567890def",
          "name": "Dr. Sarah Connor",
          "email": "sarah@example.com"
        },
        "createdAt": "2026-05-15T12:00:00.000Z",
        "updatedAt": "2026-05-15T12:00:00.000Z"
      }
    ]
  }
  ```
- **Database Capabilities**:
  - **Complex Substring Search**: If search query is provided, compiles a database `$or` regex filter matching any of: `{ title: regex }, { authors: regex }, { journalOrPublisher: regex }`.
  - **Sorting**: Multi-tier sort order descending by `publicationDate`, then descending by `createdAt` (`sort({ publicationDate: -1, createdAt: -1 })`).
  - **Populations**: Populates `project` (title, status) and `createdBy` (name, email, role).
  - **Limitations**: No pagination, no range filters on publication date. No specific DOI/ORCID identifier direct query filter.

#### `GET /api/publications/export/csv`
- **Purpose**: Export all research outputs inside the system database into an attachment spreadsheet file.
- **Access Level**: Private (Authenticated).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
- **Success Response (200 OK)**:
  - **Headers**:
    - `Content-Type: text/csv`
    - `Content-Disposition: attachment; filename="research_outputs_export.csv"`
  - **Payload Body**:
    ```csv
    ID,Title,Output Type,Project,Authors,Journal/Publisher,Publication Date,DOI,Status
    "603d2b78f1a23c4567890pub1","Deep Neural Networks for Satellite Imagery","Publication","Smart Satellite Data Processing","Dr. Sarah Connor; Dr. Kyle Reese","IEEE Transactions on Geoscience","2026-05-15","10.1109/TGRS.2026.1234567","Published"
    ```
- **Database Capabilities / Implementation Details**:
  - **CSV Marshalling**: Queries all publications from MongoDB, sorting them by `createdAt: -1` and populating the parent project `title` field. Generates the headers, processes author arrays into semicolon-separated strings (`"Author 1; Author 2"`), replaces inner quotes in fields with doubled quotes to escape CSV parsing bugs, and streams plain text.
  - **Limitations / Deficiencies**: Always streams the entire collection. No option exists to filter the exported records (e.g. scoping export to a single project, year, or output type).

#### `GET /api/publications/:id`
- **Purpose**: Get specific research output details.
- **Access Level**: Private (Authenticated).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  - **URL Params**: `id` (Publication ID, required).
- **Success Response (200 OK)**:
  Returns full populated Publication document.

#### `POST /api/publications`
- **Purpose**: Register a new publication output.
- **Access Level**: Private (Authenticated).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`, `Content-Type: application/json`
  - **Body Fields**:
    | Field Name | Data Type | Requirement | Constraints |
    | :--- | :--- | :--- | :--- |
    | `project` | String | Required | 24-character hex Project ObjectId. |
    | `outputType`| String | Required | Enum: `Publication`, `Patent`, `Dataset`, `Conference Paper`, `Book Chapter`, `Software`. |
    | `title` | String | Required | Output title. |
    | `authors` | Array/String| Optional | Array of author names. If a single string is passed, it is coerced to a single-item array. |
    | `externalIdentifiers`| Object | Optional | Sub-keys: `doi`, `scopusId`, `orcid`, `isbn`. |
    | `links` | Array/String| Optional | Array of URL strings. Single strings are coerced to a single-item array. |
    | `publicationDate` | Date | Optional | Date of publication. Defaults to current date. |
    | `journalOrPublisher`| String | Optional | |
    | `status` | String | Optional | Enum: `Draft`, `Submitted`, `Under Review`, `Published`, `Granted`. Defaults to `'Published'`. |
- **Success Response (210 Created)**:
  ```json
  {
    "success": true,
    "message": "Research output registered successfully",
    "publication": { ... }
  }
  ```
- **Error States**:
  - `400 Bad Request`: Missing body components.
  - `404 Not Found`: Associated Project not found.

#### `PUT /api/publications/:id`
- **Purpose**: Update details of a research output / publication record.
- **Access Level**: Private (Authenticated).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`, `Content-Type: application/json`
  - **URL Params**: `id` (Publication ID, required).
  - **Body Fields**: Any subset of the Publication schema fields.
- **Success Response (200 OK)**:
  Returns updated populated Publication object.

#### `DELETE /api/publications/:id`
- **Purpose**: Delete research output.
- **Access Level**: Private (Admin or Manager roles only).
- **Request Requirements**:
  - **Headers**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  - **URL Params**: `id` (Publication ID, required).
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Research output deleted successfully"
  }
  ```
- **Error States**:
  - `403 Forbidden`: Attempted by Researcher or External Partner.
  - `404 Not Found`: Record not found.
