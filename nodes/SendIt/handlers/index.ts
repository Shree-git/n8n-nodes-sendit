import type { ResourceHandler } from '../helpers';
import { handlePost } from './post';
import { handleAi } from './ai';
import { handleMedia } from './media';
import { handleScheduledPost } from './scheduledPost';
import { handleAccount } from './account';
import { handleValidation } from './validation';
import { handleAnalytics } from './analytics';
import { handleBrandVoice } from './brandVoice';
import { handleCampaign } from './campaign';
import { handleInbox } from './inbox';
import { handleListening } from './listening';
import { handleAiMedia } from './aiMedia';
import { handleMeta } from './meta';
import { handleContentScore } from './contentScore';
import { handleLibrary } from './library';
import { handleApprovals } from './approvals';
import { handleBulkSchedule } from './bulkSchedule';
import { handleConnect } from './connect';
import { handleWebhooks } from './webhooks';
import { handleAdvanced } from './advanced';
import { handleDeadLetter } from './deadLetter';
import { handleAuditLog } from './auditLog';
import { handleConversions } from './conversions';

export const RESOURCE_HANDLERS: Record<string, ResourceHandler> = {
  post: handlePost,
  ai: handleAi,
  media: handleMedia,
  scheduledPost: handleScheduledPost,
  account: handleAccount,
  validation: handleValidation,
  analytics: handleAnalytics,
  brandVoice: handleBrandVoice,
  campaign: handleCampaign,
  inbox: handleInbox,
  listening: handleListening,
  aiMedia: handleAiMedia,
  meta: handleMeta,
  contentScore: handleContentScore,
  library: handleLibrary,
  approvals: handleApprovals,
  bulkSchedule: handleBulkSchedule,
  connect: handleConnect,
  webhooks: handleWebhooks,
  advanced: handleAdvanced,
  deadLetter: handleDeadLetter,
  auditLog: handleAuditLog,
  conversions: handleConversions,
};
