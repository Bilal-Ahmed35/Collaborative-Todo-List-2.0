import React, { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Chip,
} from "@mui/material";
import apiService from "../services/apiService";

export default function InvitationHandler({
  user,
  showSnackbar,
  setActiveListId,
}) {
  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [mounted, setMounted] = useState(true);

  // Safe state update helper
  const safeSetState = useCallback(
    (setter) => {
      if (mounted) {
        setter();
      }
    },
    [mounted]
  );

  // Clear URL parameters helper
  const clearUrlParams = useCallback(() => {
    try {
      const url = new URL(window.location);
      url.searchParams.delete("invite");
      url.searchParams.delete("email");
      window.history.replaceState({}, document.title, url.toString());
    } catch (error) {
      console.error("Error clearing URL params:", error);
    }
  }, []);

  // Enhanced error handling
  const handleError = useCallback(
    (error, context) => {
      console.error(`Error in ${context}:`, error);

      let message = "An unexpected error occurred. Please try again.";

      if (error.message.includes("Access denied")) {
        message =
          "Access denied. Please sign in with the correct email address.";
      } else if (error.message.includes("not found")) {
        message = "Invitation not found or has expired.";
      } else if (error.message.includes("Network")) {
        message = "Network error. Please check your connection and try again.";
      } else if (error.message) {
        message = error.message;
      }

      showSnackbar(message, "error");
    },
    [showSnackbar]
  );

  useEffect(() => {
    return () => {
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    // Check for invitation parameters in URL
    const urlParams = new URLSearchParams(window.location.search);
    const inviteListId = urlParams.get("invite");
    const inviteEmail = urlParams.get("email");

    if (inviteListId && inviteEmail && user && mounted) {
      handleInviteFromUrl(inviteListId, inviteEmail);
    }
  }, [user, mounted]);

  const handleInviteFromUrl = async (listId, email) => {
    if (!user || !mounted) return;

    // Validate inputs
    if (!listId || !email) {
      showSnackbar("Invalid invitation link.", "error");
      clearUrlParams();
      return;
    }

    // Check if the user's email matches the invitation email
    if (user.email.toLowerCase() !== email.toLowerCase()) {
      showSnackbar(
        `This invitation is for ${email}. Please sign in with the correct email address.`,
        "error"
      );
      clearUrlParams();
      return;
    }

    safeSetState(() => setLoading(true));

    try {
      // Get invitation data from API
      const invitation = await apiService.getInvitation(listId, email);

      if (!mounted) return;

      if (!invitation) {
        showSnackbar(
          "Invitation not found or has expired. The list owner may need to send a new invitation.",
          "error"
        );
        clearUrlParams();
        return;
      }

      // Check if invitation has expired
      const expiresAt = new Date(invitation.expiresAt);
      if (expiresAt < new Date()) {
        showSnackbar(
          "This invitation has expired. Please ask for a new invitation.",
          "error"
        );
        clearUrlParams();
        return;
      }

      // Show invitation dialog
      if (mounted) {
        safeSetState(() =>
          setInviteData({
            ...invitation,
            listId,
            email,
          })
        );
        safeSetState(() => setDialogOpen(true));
      }
    } catch (error) {
      if (!mounted) return;
      handleError(error, "processing invitation");
      clearUrlParams();
    } finally {
      if (mounted) {
        safeSetState(() => setLoading(false));
      }
    }
  };

  const acceptInvitation = async () => {
    if (!inviteData || !user || !mounted) return;

    safeSetState(() => setProcessing(true));

    try {
      console.log("Accepting invitation for list:", inviteData.listId);

      // The backend will handle adding the user to the list
      // when they authenticate and have pending invitations

      showSnackbar(
        `Welcome to "${inviteData.listName}"! You now have ${inviteData.role} access.`,
        "success"
      );

      // Set the newly joined list as active
      if (setActiveListId) {
        setTimeout(() => {
          if (mounted) {
            setActiveListId(inviteData.listId);
          }
        }, 1000);
      }

      safeSetState(() => setDialogOpen(false));
      clearUrlParams();

      // Refresh the page to reload data with new list access
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      if (!mounted) return;
      console.error("Error accepting invitation:", error);
      handleError(error, "accepting invitation");
    } finally {
      if (mounted) {
        safeSetState(() => setProcessing(false));
      }
    }
  };

  const declineInvitation = async () => {
    if (!inviteData || !mounted) return;

    safeSetState(() => setProcessing(true));

    try {
      // For now, we'll just close the dialog and clear the URL
      // In a full implementation, you might want to notify the inviter

      if (!mounted) return;

      showSnackbar("Invitation declined.", "info");
      safeSetState(() => setDialogOpen(false));
      clearUrlParams();
    } catch (error) {
      if (!mounted) return;
      console.error("Error declining invitation:", error);
      showSnackbar("Failed to decline invitation.", "error");
    } finally {
      if (mounted) {
        safeSetState(() => setProcessing(false));
      }
    }
  };

  const getRoleDescription = (role) => {
    const descriptions = {
      viewer: "View tasks, comments, and activity",
      editor: "Create, edit, and complete tasks",
      owner: "Full control including member management and list deletion",
    };
    return descriptions[role] || role;
  };

  const getRoleColor = (role) => {
    const colors = {
      owner: "error",
      editor: "warning",
      viewer: "info",
    };
    return colors[role] || "default";
  };

  // Handle dialog close
  const handleDialogClose = useCallback(() => {
    if (!processing && mounted) {
      setDialogOpen(false);
      clearUrlParams();
    }
  }, [processing, mounted, clearUrlParams]);

  if (loading) {
    return (
      <Dialog open={true} maxWidth="sm" fullWidth disableEscapeKeyDown>
        <DialogContent sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress size={48} />
          <Typography sx={{ mt: 2 }} variant="h6">
            Processing invitation...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while we verify your invitation
          </Typography>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={dialogOpen}
      onClose={handleDialogClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={processing}
    >
      {inviteData && (
        <>
          <DialogTitle>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              🎉 You've been invited!
            </Box>
          </DialogTitle>
          <DialogContent>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {inviteData.listName}
                </Typography>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
                >
                  <Typography variant="body2">Your role:</Typography>
                  <Chip
                    label={inviteData.role}
                    color={getRoleColor(inviteData.role)}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  As a {inviteData.role}, you'll be able to:{" "}
                  {getRoleDescription(inviteData.role)}
                </Typography>
              </CardContent>
            </Card>

            <Alert severity="info">
              <Typography variant="body2">
                <strong>{inviteData.invitedByName}</strong> invited you to
                collaborate on this list. By accepting, you'll gain{" "}
                <strong>{inviteData.role}</strong> access and can start
                collaborating immediately.
              </Typography>
            </Alert>

            {processing && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Processing your request... Please don't close this window.
                </Typography>
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={declineInvitation}
              disabled={processing}
              color="inherit"
            >
              {processing ? "Processing..." : "Decline"}
            </Button>
            <Button
              onClick={acceptInvitation}
              variant="contained"
              disabled={processing}
            >
              {processing ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={16} />
                  Joining...
                </Box>
              ) : (
                "Accept & Join"
              )}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
