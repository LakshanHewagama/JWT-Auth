# Payment Tracker API

A complete Node.js/Express.js authentication system with JWT tokens, refresh tokens, and cookie-based security.

## Features

- ✅ User Registration 
- ✅ User Login with JWT access tokens
- ✅ Refresh token mechanism (stored in httpOnly cookies)
- ✅ Password reset functionality
- ✅ Password change for authenticated users
- ✅ Profile management
- ✅ Account deactivation
- ✅ Rate limiting
- ✅ Token blacklisting
- ✅ CORS protection
- ✅ Input validation with Joi
- ✅ Password hashing with bcrypt

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: Joi
- **Security**: Rate limiting, CORS, httpOnly cookies

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd r-payment-tracker-sl-2
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=your_mongodb_connection_string

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_very_long_and_complex
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key_here_make_it_very_long_and_complex
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Cookie Configuration
COOKIE_SECRET=your_cookie_secret_key_here

# Frontend URL
CLIENT_URL=http://localhost:3000
```

4. Start the server
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "Password123",
  "confirmPassword": "Password123"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Authentication successful",
  "data": {
    "user": {
      "_id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "role": "user",
      "isActive": true,
      "isEmailVerified": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "jwt_access_token",
    "tokenExpiry": "2024-01-01T00:15:00.000Z"
  }
}
```

#### Login User
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "Password123",
  "rememberMe": false
}
```

#### Logout User
```http
POST /auth/logout
```
*Requires Authentication*

#### Refresh Token
```http
POST /auth/refresh-token
```
*Uses refresh token from httpOnly cookie*

#### Forgot Password
```http
POST /auth/forgot-password
```

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

#### Reset Password
```http
POST /auth/reset-password
```

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "NewPassword123",
  "confirmPassword": "NewPassword123"
}
```

#### Change Password
```http
POST /auth/change-password
```
*Requires Authentication*

**Request Body:**
```json
{
  "currentPassword": "OldPassword123",
  "password": "NewPassword123",
  "confirmPassword": "NewPassword123"
}
```

#### Get Current User
```http
GET /auth/me
```
*Requires Authentication*

#### Update Profile
```http
PATCH /auth/update-me
```
*Requires Authentication*

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@example.com"
}
```

#### Delete Account
```http
DELETE /auth/delete-me
```
*Requires Authentication*

### Other Endpoints

#### Health Check
```http
GET /health
```

#### API Info
```http
GET /api/v1
```

## Authentication Flow

### 1. Token-Based Authentication
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days (30 days if "Remember Me" is checked)
- Access token is returned in the response body; client sends it via Authorization header
- Only the refresh token is stored in an httpOnly cookie

### 2. Token Refresh
- When access token expires, use refresh token to get a new access token
- Refresh token rotation: new refresh token issued with each refresh

### 3. Token Blacklisting
- Refresh tokens are blacklisted on logout
- System checks blacklist before accepting refresh tokens

### 4. Security Features
- Rate limiting on authentication endpoints
- Password complexity requirements
- CORS protection
- Input validation and sanitization
- HTTP security headers

## Password Requirements

- Minimum 6 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

## Rate Limiting

- **Authentication endpoints**: 5 requests per 15 minutes
- **Password reset**: 3 requests per hour
- **Global limit**: 100 requests per 15 minutes

## Error Responses

All error responses follow this format:
```json
{
  "status": "fail|error",
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Field-specific error message"
    }
  ]
}
```

## Database Models

### User Model
```javascript
{
  firstName: String,
  lastName: String,
  email: String (unique),
  password: String (hashed),
  role: String (enum: ['user', 'admin']),
  isActive: Boolean,
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordChangedAt: Date,
  lastLogin: Date,
  refreshTokens: [{ token: String, createdAt: Date }],
  createdAt: Date,
  updatedAt: Date
}
```

### Token Model (for blacklisting)
```javascript
{
  token: String,
  type: String (enum: ['refresh']),
  userId: ObjectId,
  blacklisted: Boolean,
  expiresAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Security Best Practices

1. **Environment Variables**: Never commit sensitive data
2. **HTTPS**: Use HTTPS in production
3. **Rate Limiting**: Prevents brute force attacks
4. **Input Validation**: All inputs are validated
5. **Password Hashing**: Passwords are hashed with bcrypt
6. **JWT Security**: Short-lived access tokens with secure refresh mechanism
7. **Cookie Security**: httpOnly, secure, sameSite cookies
8. **Token Blacklisting**: Prevents token reuse after logout

## Development

### Project Structure
```
src/
├── controllers/
│   └── auth.controller.js
├── middleware/
│   └── auth.js
├── models/
│   ├── User.js
│   └── Token.js
├── routes/
│   └── auth.routes.js
├── utils/
│   └── emailService.js
├── validators/
│   └── auth.schemas.js
├── app.js
└── server.js
```

### Scripts
```bash
npm run dev    # Start development server with nodemon
npm start      # Start production server
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.

## Password Reset
Currently, the password reset functionality returns the reset token in the response for development purposes. In a production environment, you should:
1. Set up an email service (NodeMailer, SendGrid, etc.)
2. Send the reset token via email instead of returning it in the response
3. Remove the `resetToken` from the forgot password response
3. Remove the `resetToken` from the forgot password response
This project is licensed under the ISC License.
npm run dev    # Start development server with nodemon
npm start      # Start production server
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.
