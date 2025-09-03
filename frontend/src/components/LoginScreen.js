import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import { Google as GoogleIcon } from "@mui/icons-material";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import authService from "../services/authService";

// Initialize Google Auth for web
if (typeof window !== "undefined" && !window.google) {
  // Load Google Identity Services script
  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    try {
      // Initialize Google Auth if not already done
      if (window.google && window.google.accounts) {
        // Use Google Identity Services (new method)
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
          scope: "email profile",
          callback: async (response) => {
            try {
              if (response.access_token) {
                // Get user info using the access token
                const userInfoResponse = await fetch(
                  `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${response.access_token}`
                );
                const userInfo = await userInfoResponse.json();

                // Create a JWT token with user info
                const userData = {
                  uid: userInfo.id,
                  email: userInfo.email,
                  displayName: userInfo.name,
                  photoURL: userInfo.picture,
                };

                await authService.signInWithGoogle(JSON.stringify(userData));
              }
            } catch (error) {
              console.error("Error processing Google auth response:", error);
              setError("Authentication failed. Please try again.");
            } finally {
              setLoading(false);
            }
          },
        });

        client.requestAccessToken();
      } else {
        // Fallback: prompt user to use their own Google token
        const googleToken = prompt(
          "Please paste your Google ID token here:\n\n" +
            "You can get this from:\n" +
            "1. Go to https://developers.google.com/oauthplayground\n" +
            "2. Select Google OAuth2 API v2\n" +
            "3. Authorize and get the ID token"
        );

        if (googleToken) {
          await authService.signInWithGoogle(googleToken);
        } else {
          setError("Google authentication token is required");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Alternative simple login for development/demo
  const handleDemoLogin = async () => {
    setLoading(true);
    setError("");

    try {
      // Create a demo user
      const demoUser = {
        uid: `demo_${Date.now()}`,
        email: "demo@example.com",
        displayName: "Demo User",
        photoURL: null,
      };

      // For demo purposes, we'll use the demo user data as the token
      await authService.signInWithGoogle(JSON.stringify(demoUser));
    } catch (error) {
      console.error("Demo login error:", error);
      setError("Demo login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <Card sx={{ maxWidth: 400, width: "100%", mx: 2 }}>
        <CardContent sx={{ textAlign: "center", p: 4 }}>
          <Typography
            variant="h4"
            gutterBottom
            color="primary"
            fontWeight="bold"
          >
            Collab Todo
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Collaborate on tasks with your team in real-time
          </Typography>
          <Typography variant="caption" color="text.secondary" paragraph>
            Now powered by MongoDB for better performance and scalability
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={
              loading ? <CircularProgress size={20} /> : <GoogleIcon />
            }
            onClick={handleGoogleSignIn}
            disabled={loading}
            sx={{ mt: 2, py: 1.5 }}
          >
            {loading ? "Signing in..." : "Continue with Google"}
          </Button>

          {/* Demo login for development */}
          {process.env.NODE_ENV === "development" && (
            <>
              <Typography variant="body2" sx={{ my: 2 }}>
                or
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                onClick={handleDemoLogin}
                disabled={loading}
                sx={{ py: 1.5 }}
              >
                Demo Login (Development)
              </Button>
            </>
          )}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 2, display: "block" }}
          >
            By signing in, you agree to our terms and privacy policy
          </Typography>

          {/* Instructions for Google setup */}
          {!process.env.REACT_APP_GOOGLE_CLIENT_ID && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="caption">
                To enable Google authentication, set REACT_APP_GOOGLE_CLIENT_ID
                in your .env file
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
