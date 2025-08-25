# 🔗 **AI App Builder Backend API Documentation**

## **Base URL**
```
http://localhost:5001/api
```

## **Authentication**
All protected endpoints require the `Authorization` header:
```
Authorization: Bearer <access_token>
```

---

## **🔐 Authentication Endpoints**

### **1. User Registration**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isEmailVerified": false
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token"
    }
  }
}
```

### **2. User Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isEmailVerified": true
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token"
    }
  }
}
```

### **3. Refresh Token**
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "jwt_refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "new_jwt_access_token",
      "refreshToken": "new_jwt_refresh_token"
    }
  }
}
```

### **4. Get Current User**
```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isEmailVerified": true,
      "avatar": "avatar_url",
      "bio": "User bio",
      "preferences": {
        "notifications": {
          "email": true,
          "push": false
        },
        "privacy": {
          "profileVisibility": "public",
          "showEmail": false
        }
      }
    }
  }
}
```

### **5. Logout**
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```
**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### **6. Forgot Password**
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```
**Response:**
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

### **7. Reset Password**
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token",
  "password": "NewSecurePass123!"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Password reset successful",
  "data": {
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token"
    }
  }
}
```

### **8. Verify Email**
```http
GET /api/auth/verify-email/:token
```
**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

### **9. Resend Verification Email**
```http
POST /api/auth/resend-verification
Authorization: Bearer <access_token>
```
**Response:**
```json
{
  "success": true,
  "message": "Verification email sent successfully"
}
```

### **10. OAuth**
- **Google OAuth:**  
  - `GET /api/auth/google`  
  - `GET /api/auth/google/callback`
- **GitHub OAuth:**  
  - `GET /api/auth/github`  
  - `GET /api/auth/github/callback`

OAuth endpoints redirect to the frontend with tokens as query parameters.

---

## **🩺 Health Check**

```http
GET /health
```
**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-06-22T12:34:56.789Z",
  "environment": "development"
}
```

---

## **🤖 AI App Builder Endpoints**

### **1. Generate Application**
```http
POST /api/generate-app
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "userInput": "I want to build a SaaS dashboard for project management with user authentication and payment integration",
  "preferences": {
    "framework": "nextjs",
    "auth": "clerk",
    "database": "prisma",
    "payments": "stripe"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "App generation started successfully",
  "data": {
    "projectId": "64f8b1a2e1234567890abcde",
    "chatId": "64f8b1a2e1234567890abcdf",
    "status": "analyzing",
    "progress": 5,
    "currentStep": "Analyzing requirements",
    "estimatedTime": 30
  }
}
```

### **2. Get Generation Status**
```http
GET /api/generate-app/:projectId/status
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Status retrieved successfully",
  "data": {
    "projectId": "64f8b1a2e1234567890abcde",
    "status": "complete",
    "progress": 100,
    "currentStep": "Complete",
    "qualityScore": 95,
    "stats": {
      "totalFiles": 24,
      "totalSize": 156789,
      "linesOfCode": 1250
    }
  }
}
```

---

## **📁 Project Management Endpoints**

### **1. Get User Projects**
```http
GET /api/projects?page=1&limit=20&status=complete&sort=createdAt&order=desc
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Projects retrieved successfully",
  "data": [
    {
      "_id": "64f8b1a2e1234567890abcde",
      "name": "Project Management App",
      "description": "A SaaS dashboard for project management",
      "status": "complete",
      "progress": 100,
      "requirements": {
        "features": ["dashboard", "authentication", "payments"],
        "complexity": "medium",
        "estimatedComponents": 12
      },
      "techStack": {
        "framework": "nextjs",
        "language": "typescript",
        "styling": "tailwindcss",
        "database": "prisma",
        "auth": "clerk"
      },
      "stats": {
        "totalFiles": 24,
        "totalSize": 156789,
        "linesOfCode": 1250
      },
      "qualityScore": 95,
      "isPublic": false,
      "createdAt": "2024-06-22T12:34:56.789Z",
      "updatedAt": "2024-06-22T13:45:12.123Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

### **2. Get Single Project**
```http
GET /api/projects/:id
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Project retrieved successfully",
  "data": {
    "_id": "64f8b1a2e1234567890abcde",
    "name": "Project Management App",
    "description": "A SaaS dashboard for project management",
    "userInput": "I want to build a SaaS dashboard for project management with user authentication and payment integration",
    "status": "complete",
    "progress": 100,
    "requirements": {
      "features": ["dashboard", "authentication", "payments"],
      "entities": ["users", "projects", "tasks"],
      "integrations": ["auth", "database", "payments"],
      "complexity": "medium",
      "estimatedComponents": 12
    },
    "components": [
      {
        "componentId": "64f8b1a2e1234567890abc01",
        "variantId": "modern-auth",
        "customizations": {}
      }
    ],
    "files": [
      {
        "path": "package.json",
        "type": "file"
      },
      {
        "path": "src/app/page.tsx",
        "type": "file"
      }
    ],
    "integrations": ["clerk", "prisma", "stripe"],
    "qualityScore": 95,
    "techStack": {
      "framework": "nextjs",
      "language": "typescript",
      "styling": "tailwindcss",
      "database": "prisma",
      "auth": "clerk"
    },
    "stats": {
      "totalFiles": 24,
      "totalSize": 156789,
      "linesOfCode": 1250
    },
    "isPublic": false,
    "createdAt": "2024-06-22T12:34:56.789Z",
    "updatedAt": "2024-06-22T13:45:12.123Z"
  }
}
```

### **3. Update Project**
```http
PUT /api/projects/:id
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "name": "Updated Project Name",
  "description": "Updated project description",
  "isPublic": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project updated successfully",
  "data": {
    "_id": "64f8b1a2e1234567890abcde",
    "name": "Updated Project Name",
    "description": "Updated project description",
    "isPublic": true
  }
}
```

### **4. Delete Project**
```http
DELETE /api/projects/:id
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

### **5. Download Project**
```http
GET /api/projects/:id/download
Authorization: Bearer <access_token>
```

**Response:** ZIP file download with project files and README

### **6. Get Project Files**
```http
GET /api/projects/:id/files?path=src/app/page.tsx
Authorization: Bearer <access_token>
```

**Response (File Tree):**
```json
{
  "success": true,
  "message": "Files retrieved successfully",
  "data": {
    "tree": {
      "src": {
        "type": "directory",
        "children": {
          "app": {
            "type": "directory",
            "children": {
              "page.tsx": {
                "type": "file",
                "path": "src/app/page.tsx"
              }
            }
          }
        }
      },
      "package.json": {
        "type": "file",
        "path": "package.json"
      }
    },
    "totalFiles": 24,
    "files": [
      { "path": "package.json", "type": "file" },
      { "path": "src/app/page.tsx", "type": "file" }
    ]
  }
}
```

**Response (Single File):**
```json
{
  "success": true,
  "message": "File retrieved successfully",
  "data": {
    "path": "src/app/page.tsx",
    "content": "export default function HomePage() {\n  return (\n    <div>Welcome to your app!</div>\n  );\n}",
    "type": "file"
  }
}
```

### **7. Share Project**
```http
POST /api/projects/:id/share
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Share link generated successfully",
  "data": {
    "shareToken": "abc123def456",
    "shareUrl": "http://localhost:3000/share/abc123def456",
    "isPublic": false
  }
}
```

### **8. Get Public Projects**
```http
GET /api/projects/public/explore?page=1&limit=10&sort=createdAt
```

**Response:**
```json
{
  "success": true,
  "message": "Public projects retrieved successfully",
  "data": [
    {
      "_id": "64f8b1a2e1234567890abcde",
      "name": "Project Management App",
      "description": "A SaaS dashboard for project management",
      "requirements": {
        "features": ["dashboard", "authentication", "payments"],
        "complexity": "medium"
      },
      "techStack": {
        "framework": "nextjs",
        "language": "typescript",
        "styling": "tailwindcss"
      },
      "stats": {
        "totalFiles": 24,
        "linesOfCode": 1250
      },
      "qualityScore": 95,
      "createdAt": "2024-06-22T12:34:56.789Z",
      "userId": {
        "firstName": "John",
        "lastName": "Doe",
        "avatar": "avatar_url"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

---

## **📋 Summary Table**

| Endpoint                        | Method | Auth Required | Description                        |
|----------------------------------|--------|---------------|------------------------------------|
| **Authentication**              |        |               |                                    |
| /api/auth/register              | POST   | No            | Register new user                  |
| /api/auth/login                 | POST   | No            | Login user                         |
| /api/auth/refresh               | POST   | No            | Refresh JWT tokens                 |
| /api/auth/me                    | GET    | Yes           | Get current user info              |
| /api/auth/logout                | POST   | Yes           | Logout user                        |
| /api/auth/forgot-password       | POST   | No            | Request password reset             |
| /api/auth/reset-password        | POST   | No            | Reset password                     |
| /api/auth/verify-email/:token   | GET    | No            | Verify email                       |
| /api/auth/resend-verification   | POST   | Yes           | Resend verification email          |
| /api/auth/google                | GET    | No            | Google OAuth login                 |
| /api/auth/google/callback       | GET    | No            | Google OAuth callback              |
| /api/auth/github                | GET    | No            | GitHub OAuth login                 |
| /api/auth/github/callback       | GET    | No            | GitHub OAuth callback              |
| **AI App Builder**              |        |               |                                    |
| /api/generate-app               | POST   | Yes           | Generate new application           |
| /api/generate-app/:id/status    | GET    | Yes           | Get generation status              |
| **Project Management**          |        |               |                                    |
| /api/projects                   | GET    | Yes           | Get user's projects                |
| /api/projects/:id               | GET    | Yes           | Get single project                 |
| /api/projects/:id               | PUT    | Yes           | Update project                     |
| /api/projects/:id               | DELETE | Yes           | Delete project                     |
| /api/projects/:id/download      | GET    | Yes           | Download project ZIP               |
| /api/projects/:id/files         | GET    | Yes           | Get project files                  |
| /api/projects/:id/share         | POST   | Yes           | Generate share link                |
| /api/projects/public/explore    | GET    | No            | Get public projects                |
| **System**                      |        |               |                                    |
| /health                         | GET    | No            | Health check                       |

---

## **🔧 Error Responses**

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

## **📝 Validation Rules**

### **Registration**
- Email: Valid email format
- Password: Min 8 chars, must contain uppercase, lowercase, number, and special character
- First/Last Name: 2-50 chars, letters and spaces only

### **Login**
- Email: Valid email format
- Password: Required

### **Password Reset**
- Token: Required
- Password: Same rules as registration

---

## **🚀 Frontend Integration Tips**

1. **Token Management**: Store `accessToken` in memory/session storage, `refreshToken` in secure storage
2. **Auto-refresh**: Implement token refresh logic when 401 errors occur
3. **Error Handling**: Check `success` field in all responses
4. **Loading States**: Show loading indicators during API calls
5. **Validation**: Implement client-side validation matching backend rules

---

If you need the **request/response details for future mentor/session APIs** or want to add more endpoints, just let me know! 