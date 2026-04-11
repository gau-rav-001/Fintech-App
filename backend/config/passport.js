const passport      = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User           = require("../models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL,
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

module.exports = passport;
