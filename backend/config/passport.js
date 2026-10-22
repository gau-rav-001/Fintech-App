const passport      = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User           = require("../models/User");

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("No email from Google"), null);

          // Try by googleId first, then by email
          let user = await User.findByGoogleId(profile.id);
          if (!user) user = await User.findByEmail(email);

          if (user) {
            // Link googleId if not already linked
            if (!user.googleId) {
              user = await User.update(user.id, { googleId: profile.id });
            }
            return done(null, user);
          }

          // New user via Google
          user = await User.create({
            fullName:        profile.displayName,
            email,
            googleId:        profile.id,
            provider:        "google",
            profilePicture:  profile.photos?.[0]?.value || "",
            isEmailVerified: true,
          });

          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );
  console.log("✅ Google OAuth strategy registered.");
} else {
  console.log("ℹ️  GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not provided — Google OAuth is disabled.");
}

module.exports = passport;
