import { User } from "../../models/authmodels.ts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendVerificationEmail } from "../../mailservices/mail.ts";
import { sendResetPassword } from "../../mailservices/send-reset-mail.ts";
import logger from "../../configs/logger.ts";
import { GraphQLScalarType, GraphQLError, Kind } from "graphql";
import config from "../../configs/config.ts";
import { generateOTP, hashOtp, verifyOtp } from "../../utils/otp-service.ts";

// Context interface
export interface GraphQLContext {
  user?: User | null;
  ip?: string;
  token?: string;
  [key: string]: unknown;
}

// Input types
interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  verified?: boolean;
  isActive?: boolean;
}
interface Users {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  isActive: boolean;
  verified: boolean;
  otp?: string | null;
  otpExpiry?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface VerifyEmailInput {
  email: string;
  otp: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

interface ForgotPasswordInput {
  email: string;
}

interface ResetPasswordInput {
  email: string;
  otp: string;
  newPassword: string;
}

// Response types
interface CreateUserResponse {
  message: string;
  success: boolean;
  user: Users | null;
}

interface VerifyEmailResponse {
  message: string;
  success: boolean;
}

interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
  success: boolean;
}

interface LogoutResponse {
  message: string;
  success: boolean;
}

interface ChangePasswordResponse {
  message: string;
  success: boolean;
}

interface ForgotPasswordResponse {
  message: string;
  success: boolean;
}

interface ResetPasswordResponse {
  message: string;
  success: boolean;
}

// DateTime scalar type
const DateTime = new GraphQLScalarType({
  name: "DateTime",
  description: "DateTime scalar type",
  serialize: (value: unknown): string => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value);
  },
  parseValue: (value: unknown): Date => {
    return new Date(value as string);
  },
  parseLiteral: (ast): Date | null => {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

const userResolvers = {
  Query: {
    users: async (): Promise<User[]> => {
      try {
        return await User.findAll();
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("Users Query Error:", message);
        throw new GraphQLError("Failed to fetch users", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },

    user: async (_: unknown, { id }: { id: number }): Promise<User> => {
      try {
        const user = await User.findByPk(id);
        if (!user) {
          throw new GraphQLError("User not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }
        return user;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("User Query Error:", message);

        if (error instanceof GraphQLError) {
          throw error;
        }

        throw new GraphQLError("Failed to fetch user", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
  },

  Mutation: {
    // Create a new user
    createUser: async (
      _: unknown,
      { input }: { input: CreateUserInput }
    ): Promise<CreateUserResponse> => {
      try {
        const { email, firstName, lastName, password, verified, isActive } =
          input;

        if (!email || !password || !firstName || !lastName) {
          return {
            message: "All required fields must be provided",
            success: false,
            user: null,
          };
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          return {
            message: "User already exists",
            success: false,
            user: null,
          };
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = generateOTP();
        const hashedOtp = hashOtp(otp);

        const newUser = await User.create(
          {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase(),
            password: hashedPassword,
            otp: hashedOtp,
            otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
            verified: Boolean(verified ?? false),
            isActive: Boolean(isActive ?? false),
          },
          {
            returning: true,
          }
        );

        // Optional: handle email sending safely
        try {
          await sendVerificationEmail(email, otp);
        } catch (err: unknown) {
          const errMessage =
            err instanceof Error ? err.message : "Unknown error";
          logger.warn("⚠️ Email sending failed:", errMessage);
        }

        logger.info(`User created: ${email}`);

        console.log("newUser", newUser.dataValues.id);

        return {
          message: "User created successfully",
          success: true,
          user: newUser.dataValues,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("❌ Caught error:", message);
        return {
          message: "Failed to create user: " + message,
          success: false,
          user: null,
        };
      }
    },

    verifyEmail: async (
      _: unknown,
      { input }: { input: VerifyEmailInput }
    ): Promise<VerifyEmailResponse> => {
      try {
        const { email, otp } = input;

        if (!email || !otp) {
          throw new GraphQLError("Email and OTP are required", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
          throw new GraphQLError("User not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        // Use dataValues to access the actual stored data
        const storedOtp = user.dataValues.otp;
        const storedOtpExpiry = user.dataValues.otpExpiry;
        const isVerified = user.dataValues.verified;

        if (isVerified) {
          throw new GraphQLError("Email already verified", {
            extensions: { code: "BAD_REQUEST" },
          });
        }

        if (!storedOtp) {
          throw new GraphQLError(
            "No OTP found for this user. Please request a new OTP.",
            {
              extensions: { code: "BAD_REQUEST" },
            }
          );
        }

        if (!storedOtpExpiry || new Date(storedOtpExpiry) < new Date()) {
          throw new GraphQLError("OTP has expired", {
            extensions: { code: "BAD_REQUEST" },
          });
        }

        const match = verifyOtp(otp, storedOtp);

        if (!match) {
          throw new GraphQLError("Invalid OTP", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        // Update user using the model instance
        await user.update({
          verified: true,
          otp: null,
          otpExpiry: null,
          isActive: true,
        });

        return {
          message: "Email verified successfully",
          success: true,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("VerifyEmail Error:", message);

        if (error instanceof GraphQLError) {
          throw error;
        }

        throw new GraphQLError(`Verification failed: ${message}`, {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },

    // Login resolver
    login: async (
      _: unknown,
      { input }: { input: LoginInput },
      context: GraphQLContext
    ): Promise<LoginResponse> => {
      try {
        const { email, password } = input;
        const clientIp = context.ip || "unknown";

        if (!email || !password) {
          throw new GraphQLError("Email and password are required", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
          throw new GraphQLError("Invalid email or password", {
            extensions: { code: "UNAUTHENTICATED" },
          });
        }

        // DEBUG: Check actual verification status
        console.log("🔍 Login - User verification status:", {
          dotNotation: user.verified,
          dataValues: user.dataValues.verified,
          getMethod: user.get("verified"),
        });

        // Use dataValues to check verification status
        if (!user.dataValues.verified) {
          throw new GraphQLError("Please verify your email first", {
            extensions: { code: "FORBIDDEN" },
          });
        }

        if (!user.dataValues.isActive) {
          throw new GraphQLError(
            "Your account is inactive. Please contact support.",
            {
              extensions: { code: "FORBIDDEN" },
            }
          );
        }

        const match = await bcrypt.compare(password, user.dataValues.password);
        if (!match) {
          throw new GraphQLError("Invalid email or password", {
            extensions: { code: "UNAUTHENTICATED" },
          });
        }

        // Generate JWT token
        const jwttoken = jwt.sign(
          {
            email: user.dataValues.email,
            id: user.dataValues.id,
          },
          config.security.jwtSecret,
          { expiresIn: config.security.jwtExpiryIn }
        );

        logger.info(`Successful login: ${email} from IP: ${clientIp}`);

        return {
          message: "Login successful",
          token: jwttoken,
          user: {
            id: user.dataValues.id,
            email: user.dataValues.email,
            firstName: user.dataValues.firstName,
            lastName: user.dataValues.lastName,
          },
          success: true,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("Login Error:", message, "IP:", context.ip);

        if (error instanceof GraphQLError) {
          throw error;
        }

        throw new GraphQLError(`Login failed: ${message}`, {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },

    logout: async (
      _: unknown,
      __: unknown,
      context: GraphQLContext
    ): Promise<LogoutResponse> => {
      try {
        const { user, ip, token } = context;

        // Extract token from context
        if (!token) {
          logger.info(
            `Logout request with no token from IP: ${ip || "unknown"}`
          );
          return {
            message: "No active session found",
            success: true,
          };
        }

        try {
          // Verify the token to get user information
          const decoded = jwt.verify(token, config.security.jwtSecret) as {
            id: number;
            email: string;
          };

          // Find user in database
          const userFromToken = await User.findByPk(decoded.id);

          if (userFromToken) {
            // Update user's last logout time
            await User.update(
              {
                lastLogoutAt: new Date(),
              },
              { where: { id: userFromToken.id } }
            );

            logger.info("logout successful");

            return {
              message: "Logout successful",
              success: true,
            };
          }
        } catch (tokenError: unknown) {
          const errMessage =
            tokenError instanceof Error ? tokenError.message : "Unknown error";
          logger.error("Token verification error:", errMessage);
          return {
            message: "Invalid session",
            success: true,
          };
        }

        // Fallback to using user from context if token verification fails
        if (user) {
          await User.update(
            {
              lastLogoutAt: new Date(),
            },
            { where: { id: user.id } }
          );

          logger.info(
            `Successful logout for user: ${user.email} from IP: ${
              ip || "unknown"
            }`
          );
        }

        return {
          message: "Logout successful",
          success: true,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("Logout Error:", message, "IP:", context.ip);
        throw new GraphQLError(`Logout failed: ${message}`, {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },

    // Change Password resolver
    changePassword: async (
      _: unknown,
      { input }: { input: ChangePasswordInput },
      context: GraphQLContext
    ): Promise<ChangePasswordResponse> => {
      try {
        const { currentPassword, newPassword } = input;
        const { user: contextUser, ip } = context;

        // Check authentication
        if (!contextUser) {
          throw new GraphQLError("Authentication required", {
            extensions: { code: "UNAUTHENTICATED" },
          });
        }
        // Debug: Try to find user with different approaches
        console.log("Looking for user with ID:", contextUser.id);

        // Input validation
        if (!currentPassword || !newPassword) {
          throw new GraphQLError(
            "Current password and new password are required",
            {
              extensions: { code: "BAD_USER_INPUT" },
            }
          );
        }

        if (newPassword.length < 6) {
          throw new GraphQLError(
            "New password must be at least 6 characters long",
            {
              extensions: { code: "BAD_USER_INPUT" },
            }
          );
        }

        if (currentPassword === newPassword) {
          throw new GraphQLError(
            "New password must be different from current password",
            {
              extensions: { code: "BAD_USER_INPUT" },
            }
          );
        }

        // Find user
        let user = await User.findByPk(contextUser.id);
        console.log("User found with findByPk:", user?.id);

        if (!user) {
          logger.error(
            `User not found in database. Context user ID: ${contextUser.id}`
          );
          throw new GraphQLError("User not found", {
            extensions: {
              code: "NOT_FOUND",
              details: `No user found with ID: ${contextUser.id}`,
            },
          });
        }

        // Verify current password
        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) {
          logger.warn(
            `Failed password change attempt for user: ${user.email} from IP: ${
              ip || "unknown"
            }`
          );
          throw new GraphQLError("Current password is incorrect", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        // Hash new password
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12");
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        user.password = hashedPassword;
        await user.save();

        // Log successful password change
        logger.info(
          `Successful password change for user: ${user.email} from IP: ${
            ip || "unknown"
          }`
        );

        return {
          message: "Password changed successfully",
          success: true,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("ChangePassword Error:", message, "IP:", context.ip);

        if (error instanceof GraphQLError) {
          throw error;
        }

        throw new GraphQLError(`Password change failed: ${message}`, {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },

    // Forgot Password resolver
    forgotPassword: async (
      _: unknown,
      { input }: { input: ForgotPasswordInput },
      context: GraphQLContext
    ): Promise<ForgotPasswordResponse> => {
      try {
        const { email } = input;
        const { ip } = context;

        // Input validation
        if (!email) {
          throw new GraphQLError("Email is required", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new GraphQLError("Invalid email format", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        // Find user
        const user = await User.findOne({ where: { email } });
        if (!user) {
          // Still return success to prevent email enumeration
          return {
            message: "If the email exists, OTP has been sent",
            success: true,
          };
        }

        // Check if user is active
        if (!user.isActive) {
          return {
            message: "If the email exists, OTP has been sent",
            success: true,
          };
        }

        const otpforresetpassword = generateOTP();

        // Hash OTP before storing
        const hashedOtp = hashOtp(otpforresetpassword);

        // Store OTP and expiry in database
        user.otp = hashedOtp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await user.save();

        // Send OTP via email
        try {
          await sendResetPassword(user.email, otpforresetpassword);
          logger.info(
            `OTP sent successfully to: ${email} from IP: ${ip || "unknown"}`
          );
        } catch (emailError: unknown) {
          const errMessage =
            emailError instanceof Error ? emailError.message : "Unknown error";
          logger.error("Failed to send OTP email:", errMessage);
          throw new GraphQLError("Failed to send OTP. Please try again.", {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          });
        }

        return {
          message: "If the email exists, OTP has been sent",
          success: true,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("ForgotPassword Error:", message, "IP:", context.ip);

        if (error instanceof GraphQLError) {
          throw error;
        }

        throw new GraphQLError(
          `Failed to process forgot password request: ${message}`,
          {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          }
        );
      }
    },

    // Reset Password resolver
    resetPassword: async (
      _: unknown,
      { input }: { input: ResetPasswordInput },
      context: GraphQLContext
    ): Promise<ResetPasswordResponse> => {
      try {
        const { email, otp, newPassword } = input;
        const { ip } = context;

        // Input validation
        if (!email || !otp || !newPassword) {
          throw new GraphQLError("Email, OTP, and new password are required", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        if (newPassword.length < 6) {
          throw new GraphQLError(
            "New password must be at least 6 characters long",
            {
              extensions: { code: "BAD_USER_INPUT" },
            }
          );
        }

        // Find user
        const user = await User.findOne({ where: { email } });
        if (!user) {
          throw new GraphQLError("Invalid OTP or email", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        // Check if OTP exists and is not expired
        if (!user.otp || !user.otpExpiry) {
          throw new GraphQLError("OTP not generated or expired", {
            extensions: { code: "BAD_REQUEST" },
          });
        }

        if (user.otpExpiry < new Date()) {
          // Clear expired OTP
          user.otp = null;
          user.otpExpiry = null;
          await user.save();

          throw new GraphQLError("OTP has expired. Please request a new one.", {
            extensions: { code: "BAD_REQUEST" },
          });
        }

        // Verify OTP
        const isOtpValid = await bcrypt.compare(otp, user.otp);
        if (!isOtpValid) {
          throw new GraphQLError("Invalid OTP", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }

        // Hash new password
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12");
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password and clear OTP
        user.password = hashedPassword;
        user.otp = null;
        user.otpExpiry = null;
        user.lastPasswordChange = new Date();

        await user.save();

        logger.info(
          `Password reset successful for: ${email} from IP: ${ip || "unknown"}`
        );

        return {
          message: "Password reset successfully",
          success: true,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("ResetPassword Error:", message, "IP:", context.ip);

        if (error instanceof GraphQLError) {
          throw error;
        }

        throw new GraphQLError(`Password reset failed: ${message}`, {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
  },
};

export { userResolvers, DateTime };
