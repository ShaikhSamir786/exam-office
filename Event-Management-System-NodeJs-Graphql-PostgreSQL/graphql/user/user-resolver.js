const User = require("../../models/authmodels"); // Adjust path
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendVerificationEmail = require("../../mailservices/mail");
const sendResetPassword = require("../../mailservices/mail");
const logger = require("../../configs/logger");
const { GraphQLScalarType } = require("graphql");
const { Kind } = require("graphql/language");
const config = require("../../configs/config");
const { generateOTP, hashOtp, verifyOtp } = require("../../utils/otp-service");

const DateTime = new GraphQLScalarType({
  name: "DateTime",
  description: "DateTime scalar type",
  serialize: (value) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  },
  parseValue: (value) => {
    return new Date(value);
  },
  parseLiteral: (ast) => {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

const userResolvers = {
  Query: {
    // Get all users
    users: async () => {
      try {
        return await User.findAll();
      } catch (error) {
        console.error("Users Query Error:", error);
        throw new Error("Failed to fetch users");
      }
    },

    // Get a single user by ID
    user: async (_, { id }) => {
      try {
        const user = await User.findByPk(id);
        if (!user) throw new Error("User not found");
        return user;
      } catch (error) {
        console.error("User Query Error:", error);
        throw new Error("Failed to fetch user");
      }
    },
  },

  Mutation: {
    // Create a new user

    createUser: async (_, { input }) => {
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

        const newUser = await User.create({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.toLowerCase(),
          password: hashedPassword,
          otp: hashedOtp,
          otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
          verified: Boolean(verified ?? false),
          isActive: Boolean(isActive ?? false),
        });

        // Optional: handle email sending safely
        try {
          await sendVerificationEmail(email, otp);
        } catch (err) {
          logger.warn("⚠️ Email sending failed:", err.message);
        }

        return {
          message: "User created successfully",
          success: true,
          user: newUser,
        };
        logger.info(`User created: ${email}`);
      } catch (error) {
        logger.error("❌ Caught error:", error.message);
        return {
          message: "Failed to create user: " + error.message,
          success: false,
          user: null,
        };
      }
    },

    verifyEmail: async (_, { input }) => {
      try {
        const { email, otp } = input;

        // Input validation
        if (!email || !otp) {
          throw new Error("Email and OTP are required");
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
          throw new Error("User not found");
        }

        if (user.verified) {
          throw new Error("Email already verified");
        }

        if (!user.otp || !user.otpExpiry) {
          throw new Error("OTP not generated");
        }

        if (user.otpExpiry < new Date()) {
          throw new Error("OTP expired");
        }

        const match = verifyOtp(otp, user.otp);
        if (!match) {
          throw new Error("Invalid OTP");
        }

        // Update user
        user.verified = true;
        user.otp = null;
        user.otpExpiry = null;
        user.isActive = true;
        await user.save();

        return {
          message: "Email verified successfully",
          success: true,
        };
      } catch (error) {
        logger.error("VerifyEmail Error:", error);
        throw new Error(`Verification failed: ${error.message}`);
      }
    },

    // Login resolver
    login: async (_, { input }, context) => {
      try {
        const { email, password } = input;
        const clientIp = context.ip;

        // Input validation
        if (!email || !password) {
          throw new Error("Email and password are required");
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
          throw new Error("Invalid email or password"); // Generic message for security
        }

        if (!user.verified) {
          throw new Error("Please verify your email first");
        }

        if (!user.isActive) {
          throw new Error("Your account is inactive. Please contact support.");
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          throw new Error("Invalid email or password"); // Generic message for security
        }

        // Generate JWT token
        const jwttoken = jwt.sign(
          {
            email: user.email,
            id: user.id,
          },
          config.security.jwtSecret,
          { expiresIn: config.security.jwtExpiryIn }
        );

        // Log successful login
        logger.info(`Successful login: ${email} from IP: ${clientIp}`);

        return {
          message: "Login successful",
          token: jwttoken,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          success: true,
        };
      } catch (error) {
        logger.error("Login Error:", error.message, "IP:", context.ip);
        throw new Error(`Login failed: ${error.message}`);
      }
    },

    logout: async (_, __, context) => {
      try {
        const { user, ip, token } = context;

        // Extract token from context
        if (!token) {
          logger.info(`Logout request with no token from IP: ${ip}`);
          return {
            message: "No active session found",
            success: true,
          };
        }

        try {
          // Verify the token to get user information
          const decoded = jwt.verify(token, config.security.jwtSecret);

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

            return {
              message: "Logout successful",
              success: true,
            };
            logger.info("logout successful");
          }
        } catch (tokenError) {
          logger.error("Token verification error:", tokenError.message);
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
            `Successful logout for user: ${user.email} from IP: ${ip}`
          );
        }

        return {
          message: "Logout successful",
          success: true,
        };
      } catch (error) {
        logger.error("Logout Error:", error.message, "IP:", context.ip);
        throw new Error(`Logout failed: ${error.message}`);
      }
    },

    // Change Password resolver
    changePassword: async (_, { input }, context) => {
      try {
        const { currentPassword, newPassword } = input;
        const { user: contextUser, ip } = context;

        // Check authentication
        if (!contextUser) {
          throw new Error("Authentication required");
        }

        // Input validation
        if (!currentPassword || !newPassword) {
          throw new Error("Current password and new password are required");
        }

        if (newPassword.length < 6) {
          throw new Error("New password must be at least 6 characters long");
        }

        if (currentPassword === newPassword) {
          throw new Error(
            "New password must be different from current password"
          );
        }

        // Find user
        const user = await User.findByPk(contextUser.id);

        if (!user) {
          throw new Error("User not found");
        }

        // Verify current password
        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) {
          logger.warn(
            `Failed password change attempt for user: ${user.email} from IP: ${ip}`
          );
          throw new Error("Current password is incorrect");
        }

        // Hash new password
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12");
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        user.password = hashedPassword;
        await user.save();

        // Log successful password change
        logger.info(
          `Successful password change for user: ${user.email} from IP: ${ip}`
        );

        return {
          message: "Password changed successfully",
          success: true,
        };
      } catch (error) {
        logger.error("ChangePassword Error:", error.message, "IP:", context.ip);
        throw new Error(`Password change failed: ${error.message}`);
      }
    },

    // Forgot Password resolver
    forgotPassword: async (_, { input }, context) => {
      try {
        const { email } = input;
        const { ip } = context;

        // Input validation
        if (!email) {
          throw new Error("Email is required");
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error("Invalid email format");
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

        // Send OTP via email (implement your sendResetPassword function)
        try {
          await sendResetPassword(user.email, otpforresetpassword);
          console.log(`OTP sent successfully to: ${email} from IP: ${ip}`);
        } catch (emailError) {
          console.error("Failed to send OTP email:", emailError);
          throw new Error("Failed to send OTP. Please try again.");
        }

        return {
          message: "If the email exists, OTP has been sent",
          success: true,
        };
      } catch (error) {
        logger.error("ForgotPassword Error:", error.message, "IP:", context.ip);
        throw new Error(
          `Failed to process forgot password request: ${error.message}`
        );
      }
    },

    // Add to your Mutation resolvers
    resetPassword: async (_, { input }, context) => {
      try {
        const { email, otp, newPassword } = input;
        const { ip } = context;

        // Input validation
        if (!email || !otp || !newPassword) {
          throw new Error("Email, OTP, and new password are required");
        }

        if (newPassword.length < 6) {
          throw new Error("New password must be at least 6 characters long");
        }

        // Find user
        const user = await User.findOne({ where: { email } });
        if (!user) {
          throw new Error("Invalid OTP or email");
        }

        // Check if OTP exists and is not expired
        if (!user.otp || !user.otpExpiry) {
          throw new Error("OTP not generated or expired");
        }

        if (user.otpExpiry < new Date()) {
          // Clear expired OTP
          user.otp = null;
          user.otpExpiry = null;
          await user.save();

          throw new Error("OTP has expired. Please request a new one.");
        }

        // Verify OTP
        const isOtpValid = await bcrypt.compare(otp, user.otp);
        if (!isOtpValid) {
          throw new Error("Invalid OTP");
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

        return {
          message: "Password reset successfully",
          success: true,
        };
      } catch (error) {
        logger.error("ResetPassword Error:", error.message, "IP:", context.ip);
        throw new Error(`Password reset failed: ${error.message}`);
      }
    },
  },
};

module.exports = { userResolvers, DateTime };
