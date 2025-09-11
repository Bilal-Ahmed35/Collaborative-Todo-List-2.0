import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import {
  Google as GoogleIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import authService from "../services/authService";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [serverStatus, setServerStatus] = useState("checking");

  // Get Google Client ID from environment
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  // Check server connection on component mount
  useEffect(() => {
    checkServerConnection();
  }, []);

  const checkServerConnection = async () => {
    try {
      const response = await fetch("http://localhost:5000/health");
      if (response.ok) {
        setServerStatus("connected");
        setError("");
      } else {
        setServerStatus("disconnected");
        setError("Backend server is running but not responding correctly");
      }
    } catch (error) {
      setServerStatus("disconnected");
      setError(
        "Cannot connect to backend server. Please start the server on port 5000"
      );
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (serverStatus !== "connected") {
      setError("Backend server must be running for authentication");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("Google login successful, processing token...");

      // credentialResponse.credential contains the JWT ID token
      const googleToken = credentialResponse.credential;

      if (!googleToken) {
        throw new Error("No token received from Google");
      }

      await authService.signInWithGoogle(googleToken);
      console.log("Authentication successful!");
    } catch (error) {
      console.error("Login error:", error);
      setError("Authentication failed: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.error("Google login failed");
    setError("Google login was cancelled or failed");
    setLoading(false);
  };

  const getServerStatusChip = () => {
    switch (serverStatus) {
      case "checking":
        return (
          <Chip
            icon={<CircularProgress size={16} />}
            label="Checking server..."
            size="small"
          />
        );
      case "connected":
        return <Chip color="success" label="Server Connected" size="small" />;
      case "disconnected":
        return (
          <Chip
            color="error"
            icon={<WarningIcon />}
            label="Server Disconnected"
            size="small"
          />
        );
      default:
        return null;
    }
  };

  // If Google Client ID is not configured
  if (!googleClientId) {
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
        <Card sx={{ maxWidth: 600, width: "100%", mx: 2 }}>
          <CardContent sx={{ textAlign: "center", p: 4 }}>
            <Typography
              variant="h4"
              gutterBottom
              color="primary"
              fontWeight="bold"
            >
              Collab Todo
            </Typography>

            <Alert severity="error" sx={{ mt: 2, textAlign: "left" }}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Google OAuth Configuration Required
                </Typography>

                <Typography variant="body2" gutterBottom>
                  To use this application, you need to set up Google OAuth:
                </Typography>

                <Typography variant="body2" component="div">
                  <strong>Step 1:</strong> Install the Google OAuth package:
                  <br />
                  <code
                    style={{
                      backgroundColor: "rgba(0,0,0,0.1)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontFamily: "monospace",
                    }}
                  >
                    npm install @react-oauth/google
                  </code>
                </Typography>

                <Typography variant="body2" component="div" sx={{ mt: 2 }}>
                  <strong>Step 2:</strong> Get a Google Client ID:
                  <br />
                  1. Go to{" "}
                  <a
                    href="https://console.cloud.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "inherit" }}
                  >
                    Google Cloud Console
                  </a>
                  <br />
                  2. Create a new project or select existing
                  <br />
                  3. Enable Google+ API
                  <br />
                  4. Create OAuth 2.0 credentials
                  <br />
                  5. Add http://localhost:3000 to authorized origins
                </Typography>

                <Typography variant="body2" component="div" sx={{ mt: 2 }}>
                  <strong>Step 3:</strong> Add to your frontend .env file:
                  <br />
                  <code
                    style={{
                      backgroundColor: "rgba(0,0,0,0.1)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontFamily: "monospace",
                    }}
                  >
                    REACT_APP_GOOGLE_CLIENT_ID=your_client_id_here
                  </code>
                </Typography>

                <Typography variant="body2" component="div" sx={{ mt: 2 }}>
                  <strong>Step 4:</strong> Add to your backend .env file:
                  <br />
                  <code
                    style={{
                      backgroundColor: "rgba(0,0,0,0.1)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontFamily: "monospace",
                    }}
                  >
                    GOOGLE_CLIENT_ID=your_client_id_here
                    <br />
                    GOOGLE_CLIENT_SECRET=your_client_secret_here
                  </code>
                </Typography>

                <Typography variant="body2" sx={{ mt: 2 }}>
                  <strong>Step 5:</strong> Restart both frontend and backend
                  servers
                </Typography>
              </Box>
            </Alert>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              After setup, refresh this page to see the login interface
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <Card sx={{ maxWidth: 500, width: "100%", mx: 2 }}>
          <CardContent sx={{ textAlign: "center", p: 4 }}>
            <Typography
              variant="h4"
              gutterBottom
              color="primary"
              fontWeight="bold"
            >
              Collab Todo
            </Typography>

            <Typography variant="body1" color="text.secondary" gutterBottom>
              Collaborate on tasks with your team in real-time
            </Typography>

            <Typography variant="caption" color="text.secondary" gutterBottom>
              Powered by MongoDB Atlas for better performance and scalability
            </Typography>

            {/* Server status indicator */}
            <Box sx={{ mb: 3 }}>{getServerStatusChip()}</Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2, textAlign: "left" }}>
                <Box>
                  <Typography variant="body2">{error}</Typography>
                  {serverStatus === "disconnected" && (
                    <>
                      <Typography
                        variant="caption"
                        sx={{ display: "block", mt: 1 }}
                      >
                        To start the backend server:
                      </Typography>
                      <Typography
                        variant="caption"
                        component="code"
                        sx={{
                          display: "block",
                          mt: 0.5,
                          fontFamily: "monospace",
                          backgroundColor: "rgba(0,0,0,0.1)",
                          p: 0.5,
                          borderRadius: 1,
                        }}
                      >
                        cd backend && npm run server
                      </Typography>
                      <Button
                        size="small"
                        onClick={checkServerConnection}
                        sx={{ mt: 1 }}
                      >
                        Check Again
                      </Button>
                    </>
                  )}
                </Box>
              </Alert>
            )}

            {/* Google Sign In */}
            {loading ? (
              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled
                startIcon={<CircularProgress size={20} color="inherit" />}
                sx={{ mt: 2, py: 1.5 }}
              >
                Signing in...
              </Button>
            ) : (
              <Box sx={{ mt: 2 }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  disabled={serverStatus === "disconnected"}
                  size="large"
                  width="100%"
                  text="signin_with"
                />
              </Box>
            )}

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 3, display: "block" }}
            >
              By signing in, you agree to our terms and privacy policy
            </Typography>

            {/* Development Instructions */}
            <Alert severity="info" sx={{ mt: 3, textAlign: "left" }}>
              <Box>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  Development Setup:
                </Typography>
                <Typography variant="body2" component="div">
                  1. Start backend: <code>cd backend && npm run server</code>
                  <br />
                  2. Start frontend: <code>cd frontend && npm start</code>
                  <br />
                  3. Sign in with your Google account
                </Typography>
              </Box>
            </Alert>
          </CardContent>
        </Card>
      </Box>
    </GoogleOAuthProvider>
  );
}
