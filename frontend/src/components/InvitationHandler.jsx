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
    // Check for invitation parameters in URL
    const urlParams = new URLSearchParams(window.location.search);
    const inviteListId = urlParams.get("invite");
    const inviteEmail = urlParams.get("email");

    if (inviteListId && inviteEmail && user) {
      handleInviteFromUrl(inviteListId, inviteEmail);
    }
  }, [user]);

  const handleInviteFromUrl = async (listId, email) => {
    if (!user) return;

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

    setLoading(true);

    try {
      // Get invitation data from API
      const invitation = await apiService.getInvitation(listId, email);

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
      setInviteData({
        ...invitation,
        listId,
        email,
      });
      setDialogOpen(true);
    } catch (error) {
      handleError(error, "processing invitation");
      clearUrlParams();
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    console.log("Accept invitation clicked", {
      processing,
      inviteData: !!inviteData,
      user: !!user,
    });

    // Validation check
    if (!inviteData || !user) {
      console.error("Cannot accept - missing data:", {
        inviteData: !!inviteData,
        user: !!user,
      });

      if (!user) {
        showSnackbar("Please sign in first", "error");
        return;
      }

      if (!inviteData) {
        showSnackbar("Invitation data not loaded", "error");
        return;
      }

      return;
    }

    // Prevent double-clicking
    if (processing) {
      console.log("Already processing, ignoring click");
      return;
    }

    setProcessing(true);

    try {
      console.log("Accepting invitation for list:", inviteData.listId);

      // Call the backend API to accept the invitation
      await apiService.request(`/invitations/${inviteData.listId}/accept`, {
        method: "POST",
        body: JSON.stringify({
          email: inviteData.email,
          role: inviteData.role,
        }),
      });

      showSnackbar(
        `Welcome to "${inviteData.list}"! You now have ${inviteData.role} access.`,
        "success"
      );

      // Set the newly joined list as active
      if (setActiveListId) {
        setTimeout(() => {
          setActiveListId(inviteData.listId);
        }, 1000);
      }

      setDialogOpen(false);
      clearUrlParams();

      // Refresh the page to reload data with new list access
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error accepting invitation:", error);
      handleError(error, "accepting invitation");
    } finally {
      setProcessing(false);
    }
  };

  const declineInvitation = async () => {
    console.log("Decline invitation clicked", {
      processing,
      inviteData: !!inviteData,
    });

    if (!inviteData) {
      console.error("Cannot decline - missing invitation data");
      return;
    }

    // Prevent double-clicking
    if (processing) {
      console.log("Already processing, ignoring click");
      return;
    }

    setProcessing(true);

    try {
      // Call the backend API to decline the invitation
      await apiService.request(`/invitations/${inviteData.listId}/decline`, {
        method: "POST",
        body: JSON.stringify({
          email: inviteData.email,
        }),
      });

      showSnackbar("Invitation declined.", "info");
      setDialogOpen(false);
      clearUrlParams();
    } catch (error) {
      console.error("Error declining invitation:", error);

      // Even if API call fails, still close dialog and clear URL
      showSnackbar("Invitation declined.", "info");
      setDialogOpen(false);
      clearUrlParams();
    } finally {
      setProcessing(false);
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
    console.log("Dialog close requested", { processing });
    if (!processing) {
      setDialogOpen(false);
      clearUrlParams();
    }
  }, [processing, clearUrlParams]);

  // Show loading dialog
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

  // Main invitation dialog
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
              You've been invited!
            </Box>
          </DialogTitle>
          <DialogContent>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {inviteData.list}
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
              disabled={processing}
              variant="contained"
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
