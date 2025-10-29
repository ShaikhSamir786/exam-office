import { gql } from "graphql-tag";

const usermutation = gql`
  # Mutations
  type Mutation {
    createUser(input: CreateUserInput!): UserResponse
    verifyEmail(input: VerifyEmailInput!): VerifyEmailResponse!
    login(input: LoginInput!): LoginResponse!
    logout: LogoutResponse!
    changePassword(input: ChangePasswordInput!): ChangePasswordResponse!
    forgotPassword(input: ForgotPasswordInput!): ForgotPasswordResponse!
    resetPassword(input: ResetPasswordInput!): ResetPasswordResponse!
  }
`;

export default usermutation;
