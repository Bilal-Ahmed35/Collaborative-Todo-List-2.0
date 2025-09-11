// import React, { useState, useEffect } from "react";
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   TextField,
//   Button,
//   FormControl,
//   InputLabel,
//   Select,
//   MenuItem,
//   Box,
//   Typography,
// } from "@mui/material";

// export default function TaskDialog({
//   taskDialogOpen,
//   setTaskDialogOpen,
//   editingTask,
//   setEditingTask,
//   activeListId,
//   createTask,
//   updateTask,
//   members,
//   currentList,
//   showSnackbar,
// }) {
//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");
//   const [priority, setPriority] = useState("Medium");
//   const [status, setStatus] = useState("Pending");
//   const [deadline, setDeadline] = useState("");
//   const [assignedToUid, setAssignedToUid] = useState("");
//   const [loading, setLoading] = useState(false);

//   // Populate form when editing
//   useEffect(() => {
//     if (editingTask) {
//       setTitle(editingTask.title || "");
//       setDescription(editingTask.description || "");
//       setPriority(editingTask.priority || "Medium");
//       setStatus(editingTask.status || "Pending");
//       setDeadline(
//         editingTask.deadline ? editingTask.deadline.split("T")[0] : ""
//       );
//       setAssignedToUid(editingTask.assignedToUid || "");
//     } else {
//       // Clear form for new task
//       setTitle("");
//       setDescription("");
//       setPriority("Medium");
//       setStatus("Pending");
//       setDeadline("");
//       setAssignedToUid("");
//     }
//   }, [editingTask]);

//   const handleSubmit = async () => {
//     if (!title.trim()) {
//       showSnackbar("Task title is required", "error");
//       return;
//     }

//     setLoading(true);
//     try {
//       const taskData = {
//         title: title.trim(),
//         description: description.trim(),
//         priority,
//         status,
//         deadline: deadline || null,
//         assignedToUid: assignedToUid || null,
//         done: false,
//       };

//       if (editingTask) {
//         // Update existing task
//         await updateTask(activeListId, editingTask._id, taskData);
//         showSnackbar("Task updated successfully", "success");
//       } else {
//         // Create new task
//         await createTask(activeListId, taskData);
//         showSnackbar("Task created successfully", "success");
//       }

//       handleClose();
//     } catch (error) {
//       console.error("Error saving task:", error);
//       showSnackbar("Failed to save task", "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleClose = () => {
//     setTitle("");
//     setDescription("");
//     setPriority("Medium");
//     setStatus("todo");
//     setDeadline("");
//     setAssignedToUid("");
//     setEditingTask(null);
//     setTaskDialogOpen(false);
//   };

//   const availableMembers = members.filter((member) =>
//     currentList?.memberIds?.includes(member.uid)
//   );

//   return (
//     <Dialog open={taskDialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
//       <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
//       <DialogContent
//         sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
//       >
//         <TextField
//           label="Task Title *"
//           value={title}
//           onChange={(e) => setTitle(e.target.value)}
//           fullWidth
//           required
//           disabled={loading}
//           autoFocus
//         />

//         <TextField
//           label="Description"
//           value={description}
//           onChange={(e) => setDescription(e.target.value)}
//           multiline
//           rows={3}
//           fullWidth
//           disabled={loading}
//         />

//         <Box sx={{ display: "flex", gap: 2 }}>
//           <FormControl fullWidth>
//             <InputLabel>Priority</InputLabel>
//             <Select
//               value={priority}
//               label="Priority"
//               onChange={(e) => setPriority(e.target.value)}
//               disabled={loading}
//             >
//               <MenuItem value="Low">Low</MenuItem>
//               <MenuItem value="Medium">Medium</MenuItem>
//               <MenuItem value="High">High</MenuItem>
//             </Select>
//           </FormControl>

//           <FormControl fullWidth>
//             <InputLabel>Status</InputLabel>
//             <Select
//               value={status}
//               label="Status"
//               onChange={(e) => setStatus(e.target.value)}
//               disabled={loading}
//             >
//               <MenuItem value="Pending">Pending</MenuItem>
//               <MenuItem value="InProgress">In Progress</MenuItem>
//               <MenuItem value="Completed">Completed</MenuItem>
//             </Select>
//           </FormControl>
//         </Box>

//         <TextField
//           label="Deadline"
//           type="date"
//           value={deadline}
//           onChange={(e) => setDeadline(e.target.value)}
//           fullWidth
//           InputLabelProps={{ shrink: true }}
//           disabled={loading}
//           inputProps={{
//             min: new Date().toISOString().split("T")[0], // Prevent past dates
//           }}
//         />

//         <FormControl fullWidth>
//           <InputLabel>Assign To</InputLabel>
//           <Select
//             value={assignedToUid}
//             label="Assign To"
//             onChange={(e) => setAssignedToUid(e.target.value)}
//             disabled={loading}
//           >
//             <MenuItem value="">Unassigned</MenuItem>
//             {availableMembers.map((member) => (
//               <MenuItem key={member.uid} value={member.uid}>
//                 {member.displayName || member.email}
//               </MenuItem>
//             ))}
//           </Select>
//         </FormControl>
//       </DialogContent>

//       <DialogActions>
//         <Button onClick={handleClose} disabled={loading}>
//           Cancel
//         </Button>
//         <Button
//           variant="contained"
//           onClick={handleSubmit}
//           disabled={!title.trim() || loading}
//         >
//           {loading ? "Saving..." : editingTask ? "Update Task" : "Create Task"}
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// }

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
} from "@mui/material";

export default function TaskDialog({
  taskDialogOpen,
  setTaskDialogOpen,
  editingTask,
  setEditingTask,
  activeListId,
  createTask,
  updateTask,
  members,
  currentList,
  showSnackbar,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("Pending");
  const [deadline, setDeadline] = useState("");
  const [assignedToUid, setAssignedToUid] = useState("");
  const [loading, setLoading] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title || "");
      setDescription(editingTask.description || "");
      setPriority(editingTask.priority || "Medium");
      setStatus(editingTask.status || "Pending");
      setDeadline(
        editingTask.deadline ? editingTask.deadline.split("T")[0] : ""
      );
      setAssignedToUid(editingTask.assignedToUid || "");
    } else {
      // Clear form for new task
      setTitle("");
      setDescription("");
      setPriority("Medium");
      setStatus("Pending");
      setDeadline("");
      setAssignedToUid("");
    }
  }, [editingTask]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      showSnackbar("Task title is required", "error");
      return;
    }

    setLoading(true);
    try {
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        deadline: deadline || null,
        assignedToUid: assignedToUid || null,
        done: false,
      };

      // Debug logging to see what we're sending
      console.log("Sending task data:", taskData);
      console.log("Status value being sent:", status);

      if (editingTask) {
        // Update existing task
        await updateTask(activeListId, editingTask._id, taskData);
        showSnackbar("Task updated successfully", "success");
      } else {
        // Create new task
        await createTask(activeListId, taskData);
        showSnackbar("Task created successfully", "success");
      }

      handleClose();
    } catch (error) {
      console.error("Error saving task:", error);
      showSnackbar("Failed to save task", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setStatus("todo");
    setDeadline("");
    setAssignedToUid("");
    setEditingTask(null);
    setTaskDialogOpen(false);
  };

  const availableMembers = members.filter((member) =>
    currentList?.memberIds?.includes(member.uid)
  );

  return (
    <Dialog open={taskDialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
      <DialogContent
        sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
      >
        <TextField
          label="Task Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          required
          disabled={loading}
          autoFocus
        />

        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          rows={3}
          fullWidth
          disabled={loading}
        />

        <Box sx={{ display: "flex", gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={priority}
              label="Priority"
              onChange={(e) => setPriority(e.target.value)}
              disabled={loading}
            >
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              label="Status"
              onChange={(e) => setStatus(e.target.value)}
              disabled={loading}
            >
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="InProgress">In Progress</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TextField
          label="Deadline"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
          disabled={loading}
          inputProps={{
            min: new Date().toISOString().split("T")[0], // Prevent past dates
          }}
        />

        <FormControl fullWidth>
          <InputLabel>Assign To</InputLabel>
          <Select
            value={assignedToUid}
            label="Assign To"
            onChange={(e) => setAssignedToUid(e.target.value)}
            disabled={loading}
          >
            <MenuItem value="">Unassigned</MenuItem>
            {availableMembers.map((member) => (
              <MenuItem key={member.uid} value={member.uid}>
                {member.displayName || member.email}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!title.trim() || loading}
        >
          {loading ? "Saving..." : editingTask ? "Update Task" : "Create Task"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
