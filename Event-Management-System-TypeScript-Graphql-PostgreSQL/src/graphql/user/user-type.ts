import { gql } from "graphql-tag";
const userschema = gql`
  scalar DateTime

  # GraphQL User type
  type User {
    id: ID
    firstName: String
    lastName: String
    email: String
    otp: String
    otpExpiry: DateTime
    verified: Boolean
    isActive: Boolean
    createdAt: DateTime
    updatedAt: DateTime
  }

  # Input type for creating a user
  input CreateUserInput {
    firstName: String
    lastName: String
    email: String
    password: String
    verified: Boolean
    isActive: Boolean
  }

  # Response type for user data
  type UserResponse {
    message: String
    success: Boolean
    user: User
  }

  # Input type for email verification
  input VerifyEmailInput {
    email: String!
    otp: String!
  }

  # Response type for email verification
  type VerifyEmailResponse {
    message: String!
    success: Boolean!
  }

  # Input type for login
  input LoginInput {
    email: String!
    password: String!
  }

  # Response type for login
  type LoginResponse {
    message: String!
    token: String
    user: UserAuth
    success: Boolean!
  }

  # Simplified user type for auth responses
  type UserAuth {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
  }

  # Response type for logout
  type LogoutResponse {
    message: String!
    success: Boolean!
  }
  # Input type for password change
  input ChangePasswordInput {
    currentPassword: String!
    newPassword: String!
  }

  # Response type for password change
  type ChangePasswordResponse {
    message: String!
    success: Boolean!
  }

  # Input type for forgot password
  input ForgotPasswordInput {
    email: String!
  }

  # Response type for forgot password
  type ForgotPasswordResponse {
    message: String!
    success: Boolean!
  }

  # Input type for reset password
  input ResetPasswordInput {
    email: String!
    otp: String!
    newPassword: String!
  }

  # Response type for reset password
  type ResetPasswordResponse {
    message: String!
    success: Boolean!
  }
`;

export default userschema;
