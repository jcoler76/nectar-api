import mongoose, { Document, Schema } from 'mongoose';

export interface ApprovalDoc extends Document {
  workflowId: mongoose.Types.ObjectId;
  runId: mongoose.Types.ObjectId;
  nodeId: string;
  label?: string;
  instructions?: string;
  approvers?: string[];
  status: 'pending' | 'approved' | 'rejected';
  decidedAt?: Date | null;
  decidedBy?: string | null;
}

const ApprovalSchema = new Schema<ApprovalDoc>(
  {
    workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow', required: true, index: true },
    runId: { type: Schema.Types.ObjectId, ref: 'WorkflowRun', required: true, index: true },
    nodeId: { type: String, required: true },
    label: { type: String },
    instructions: { type: String },
    approvers: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    decidedAt: { type: Date, default: null },
    decidedBy: { type: String, default: null },
  },
  { timestamps: true }
);

export const Approval =
  mongoose.models.Approval || mongoose.model<ApprovalDoc>('Approval', ApprovalSchema);
