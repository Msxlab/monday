import { EventEmitter } from 'events';
import logger from './logger';

class AppEventBus extends EventEmitter {
  emitEvent(event: string, payload: Record<string, unknown>) {
    logger.info(`Event emitted: ${event}`, { event, payload });
    this.emit(event, payload);
  }
}

export const eventBus = new AppEventBus();

// Event name constants
export const APP_EVENTS = {
  PROJECT_ASSIGNED: 'project.assigned',
  PROJECT_STATUS_CHANGED: 'project.statusChanged',
  PROJECT_DEADLINE_APPROACHING: 'project.deadlineApproaching',
  COMMENT_CREATED: 'comment.created',
  LEAVE_CREATED: 'leave.created',
  LEAVE_STATUS_CHANGED: 'leave.statusChanged',
  PRODUCTION_ORDER_CREATED: 'production.orderCreated',
  PRODUCTION_ORDER_UPDATED: 'production.orderUpdated',
  REVISION_REQUESTED: 'project.revisionRequested',
} as const;
