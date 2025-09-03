import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";

export default function CreateListDialog({
  createListOpen,
  setCreateListOpen,
  setActiveListId,
  user,
  createList,
  showSnackbar,
}) {
  const [listName, setListName] = useState("");
  const [listDescription, setListDescription] = useState("");
  const [listDueDate, setListDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateList = async () => {
    if (!listName.trim()) {
      showSnackbar("List name is required", "error");
      return;
    }
    if (!listDueDate) {
      showSnackbar("Due date is required", "error");
      return;
    }

    setLoading(true);
    try {
      const listData = {
        name: listName.trim(),
        description: listDescription.trim(),
        dueDate: listDueDate,
      };

      // MongoDB returns the full object with _id, not just the ID
      const newList = await createList(listData);

      // Extract the _id from the created list (MongoDB uses _id instead of id)
      const newListId = newList._id || newList.id || newList;

      setActiveListId(newListId);
      showSnackbar("List created successfully!", "success");
      handleClose();
    } catch (error) {
      console.error("Error creating list:", error);

      // Enhanced error handling for MongoDB-specific errors
      let errorMessage = "Failed to create list";

      if (error.message?.includes("duplicate")) {
        errorMessage = "A list with this name already exists";
      } else if (error.message?.includes("validation")) {
        errorMessage = "Invalid list data. Please check your inputs";
      } else if (
        error.message?.includes("network") ||
        error.message?.includes("fetch")
      ) {
        errorMessage = "Network error. Please check your connection";
      } else if (
        error.message?.includes("unauthorized") ||
        error.message?.includes("403")
      ) {
        errorMessage = "You don't have permission to create lists";
      } else if (error.message) {
        errorMessage = error.message;
      }

      showSnackbar(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setListName("");
    setListDescription("");
    setListDueDate("");
    setCreateListOpen(false);
  };

  // Enhanced validation
  const isFormValid = () => {
    return listName.trim().length > 0 && listDueDate && !loading;
  };

  return (
    <Dialog open={createListOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New List</DialogTitle>
      <DialogContent
        sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
      >
        <TextField
          label="List Name *"
          value={listName}
          onChange={(e) => setListName(e.target.value)}
          fullWidth
          required
          error={!listName.trim() && listName.length > 0}
          helperText={
            !listName.trim() && listName.length > 0
              ? "List name is required"
              : ""
          }
          disabled={loading}
          autoFocus
          inputProps={{
            maxLength: 100, // Reasonable limit for list names
          }}
        />
        <TextField
          label="Description (optional)"
          value={listDescription}
          onChange={(e) => setListDescription(e.target.value)}
          multiline
          rows={3}
          fullWidth
          disabled={loading}
          inputProps={{
            maxLength: 500, // Reasonable limit for descriptions
          }}
          helperText={`${listDescription.length}/500 characters`}
        />
        <TextField
          label="Due Date *"
          type="date"
          value={listDueDate}
          onChange={(e) => setListDueDate(e.target.value)}
          fullWidth
          required
          error={!listDueDate}
          helperText={!listDueDate ? "Due date is required" : ""}
          InputLabelProps={{ shrink: true }}
          disabled={loading}
          inputProps={{
            min: new Date().toISOString().split("T")[0], // Prevent past dates
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCreateList}
          disabled={!isFormValid()}
        >
          {loading ? "Creating..." : "Create List"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
