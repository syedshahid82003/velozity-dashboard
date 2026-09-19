import cron from 'node-cron';
import prisma from '../config/prisma';
import { getSocketInstance } from '../socket';

/**
 * Overdue Task Flagging Job
 *
 * Runs every 15 minutes. Finds all tasks where:
 *   - dueDate < now
 *   - status is NOT already DONE or OVERDUE
 *
 * Updates them to OVERDUE, writes an activity log entry for each,
 * and emits a real-time socket event to the relevant project room.
 *
 * This MUST happen via a scheduled background job — not on page load.
 * Using node-cron (chosen over Bull because this job is simple, stateless,
 * single-process, and requires no retry/queue semantics).
 */
export function startOverdueJob(): void {
  // Runs at :00 and :15 and :30 and :45 of every hour
  cron.schedule('*/15 * * * *', async () => {
    try {
      const now = new Date();

      // Find tasks that are past due and not already terminal
      const overdueTasks = await prisma.task.findMany({
        where: {
          dueDate: { lt: now },
          status: { notIn: ['DONE', 'OVERDUE'] },
        },
        include: {
          project: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      });

      if (overdueTasks.length === 0) return;

      const io = getSocketInstance();

      for (const task of overdueTasks) {
        // Update status to OVERDUE
        await prisma.task.update({
          where: { id: task.id },
          data: { status: 'OVERDUE' },
        });

        // Write immutable activity log — stored in DB, not derived
        // Use admin user if task is unassigned (system-generated change)
        const systemUserId = task.assignedToId ?? (await prisma.user.findFirst({
          where: { role: 'ADMIN' },
          select: { id: true },
        }))?.id ?? task.project.id;

        const log = await prisma.activityLog.create({
          data: {
            projectId: task.project.id,
            taskId: task.id,
            userId: systemUserId,
            action: `task "${task.title}" was automatically marked as Overdue`,
            fromStatus: task.status,
            toStatus: 'OVERDUE',
          },
        });

        // Broadcast to the project room in real time
        if (io) {
          const event = {
            id: log.id,
            action: log.action,
            projectId: task.project.id,
            task: { id: task.id, title: task.title },
            user: { id: 'system', name: 'System' },
            createdAt: log.createdAt.toISOString(),
          };

          io.to(`project:${task.project.id}`).emit('task:overdue', {
            taskId: task.id,
            taskTitle: task.title,
          });
          io.to(`project:${task.project.id}`).emit('activity:new', event);
          io.to('admin:global').emit('activity:new', event);
        }
      }

      console.log(`[OverdueJob] Flagged ${overdueTasks.length} task(s) as OVERDUE at ${now.toISOString()}`);
    } catch (err) {
      console.error('[OverdueJob] Error:', err);
    }
  });

  console.log('[OverdueJob] Scheduled — runs every 15 minutes');
}
