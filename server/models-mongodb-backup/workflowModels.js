const mongoose = require('mongoose');
const { Schema } = mongoose;

// This schema represents a single step/action in a workflow.
const NodeSchema = new Schema({
  // Using a string ID from the frontend to make updates easier
  id: { type: String, required: true },
  type: { type: String, required: true, default: 'custom' }, // e.g., 'custom', 'httpRequest', 'ifCondition'
  data: { type: Object, required: true }, // Configuration for the node (URL, method, etc.)
  position: { type: Object, required: true }, // { x: number, y: number }
});

// This schema represents the connection between two nodes.
const EdgeSchema = new Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  sourceHandle: { type: String },
  targetHandle: { type: String },
});

// This is the main schema for an entire workflow.
const WorkflowSchema = new Schema(
  {
    name: { type: String, required: true },
    active: { type: Boolean, default: false },
    schedule: { type: String }, // Optional cron pattern for scheduled execution
    lastDatabaseCheck: { type: Date }, // Last time database triggers were checked for this workflow
    lastHubSpotCheck: { type: Date }, // Last time hubspot triggers were checked for this workflow
    // Embed the nodes and edges directly within the workflow document.
    // This is a good approach for workflows as they are typically read/written as a whole unit.
    nodes: [NodeSchema],
    edges: [EdgeSchema],
    // Link to the main User model (assuming you have one, using ObjectId)
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const Workflow = mongoose.model('Workflow', WorkflowSchema);

module.exports = { Workflow };
