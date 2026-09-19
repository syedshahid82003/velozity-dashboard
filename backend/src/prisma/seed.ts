import { PrismaClient, TaskStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Clean slate ──────────────────────────────────────────────────────────
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // ─── Users ────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@velozity.dev',
      name: 'Alex Admin',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const pm1 = await prisma.user.create({
    data: {
      email: 'sarah.pm@velozity.dev',
      name: 'Sarah Chen',
      passwordHash,
      role: 'PROJECT_MANAGER',
    },
  });

  const pm2 = await prisma.user.create({
    data: {
      email: 'james.pm@velozity.dev',
      name: 'James Wright',
      passwordHash,
      role: 'PROJECT_MANAGER',
    },
  });

  const dev1 = await prisma.user.create({
    data: {
      email: 'ravi.dev@velozity.dev',
      name: 'Ravi Patel',
      passwordHash,
      role: 'DEVELOPER',
    },
  });

  const dev2 = await prisma.user.create({
    data: {
      email: 'nina.dev@velozity.dev',
      name: 'Nina Volkov',
      passwordHash,
      role: 'DEVELOPER',
    },
  });

  const dev3 = await prisma.user.create({
    data: {
      email: 'tom.dev@velozity.dev',
      name: 'Tom Bradley',
      passwordHash,
      role: 'DEVELOPER',
    },
  });

  const dev4 = await prisma.user.create({
    data: {
      email: 'priya.dev@velozity.dev',
      name: 'Priya Sharma',
      passwordHash,
      role: 'DEVELOPER',
    },
  });

  console.log('✅ Users created');

  // ─── Clients ──────────────────────────────────────────────────────────────
  const client1 = await prisma.client.create({
    data: {
      name: 'Marcus Hunt',
      email: 'marcus@acmecorp.com',
      company: 'Acme Corporation',
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: 'Diana Lee',
      email: 'diana@nexustech.io',
      company: 'Nexus Technologies',
    },
  });

  const client3 = await prisma.client.create({
    data: {
      name: 'Carlos Rivera',
      email: 'carlos@brightwave.co',
      company: 'Brightwave Media',
    },
  });

  console.log('✅ Clients created');

  // ─── Projects ─────────────────────────────────────────────────────────────
  const project1 = await prisma.project.create({
    data: {
      name: 'Acme E-Commerce Redesign',
      description: 'Full redesign of the Acme storefront with new checkout flow and product pages.',
      clientId: client1.id,
      managerId: pm1.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Nexus Analytics Platform',
      description: 'Build a real-time data analytics dashboard for Nexus internal teams.',
      clientId: client2.id,
      managerId: pm1.id,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'Brightwave CMS Migration',
      description: 'Migrate Brightwave from legacy WordPress to a headless CMS architecture.',
      clientId: client3.id,
      managerId: pm2.id,
    },
  });

  console.log('✅ Projects created');

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
  const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000);

  // ─── Developer shorthand aliases ─────────────────────────────────────────
  const ravi = dev1;
  const nina = dev2;
  const tom = dev3;
  const priya = dev4;

  // ─── Tasks: Project 1 — Acme E-Commerce Redesign ──────────────────────────
  const t1_1 = await prisma.task.create({
    data: {
      title: 'Wireframe homepage layout',
      description: 'Create high-fidelity wireframes for the new homepage including hero and product grid.',
      projectId: project1.id,
      assignedToId: ravi.id,
      status: 'DONE',
      priority: 'HIGH',
      dueDate: daysAgo(10),
    },
  });

  const t1_2 = await prisma.task.create({
    data: {
      title: 'Implement product listing page',
      description: 'Build the product listing component with filters, pagination, and sort options.',
      projectId: project1.id,
      assignedToId: ravi.id,
      status: 'IN_REVIEW',
      priority: 'HIGH',
      dueDate: daysFromNow(2),
    },
  });

  const t1_3 = await prisma.task.create({
    data: {
      title: 'Shopping cart API integration',
      description: 'Connect frontend cart component to the backend cart service endpoints.',
      projectId: project1.id,
      assignedToId: nina.id,
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      dueDate: daysFromNow(5),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Payment gateway integration',
      description: 'Integrate Stripe checkout with webhook handling for order confirmation.',
      projectId: project1.id,
      assignedToId: nina.id,
      status: 'TODO',
      priority: 'CRITICAL',
      dueDate: daysFromNow(10),
    },
  });

  // OVERDUE task #1 — dueDate in the past, already flagged OVERDUE
  const t1_5 = await prisma.task.create({
    data: {
      title: 'Mobile responsive fixes',
      description: 'Fix layout breakpoints on mobile for product cards and nav.',
      projectId: project1.id,
      assignedToId: ravi.id,
      status: 'OVERDUE',
      priority: 'MEDIUM',
      dueDate: daysAgo(3),
    },
  });

  await prisma.task.create({
    data: {
      title: 'SEO metadata implementation',
      description: 'Add open graph tags, meta descriptions, and structured data to all pages.',
      projectId: project1.id,
      assignedToId: tom.id,
      status: 'TODO',
      priority: 'LOW',
      dueDate: daysFromNow(14),
    },
  });

  console.log('✅ Project 1 tasks created');

  // ─── Tasks: Project 2 — Nexus Analytics Platform ──────────────────────────
  const t2_1 = await prisma.task.create({
    data: {
      title: 'Design data ingestion pipeline',
      description: 'Architect the pipeline from Kafka to ClickHouse for real-time event streaming.',
      projectId: project2.id,
      assignedToId: tom.id,
      status: 'DONE',
      priority: 'CRITICAL',
      dueDate: daysAgo(15),
    },
  });

  const t2_2 = await prisma.task.create({
    data: {
      title: 'Build dashboard chart components',
      description: 'Implement line, bar, and pie chart components using Recharts with live data.',
      projectId: project2.id,
      assignedToId: priya.id,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: daysFromNow(3),
    },
  });

  const t2_3 = await prisma.task.create({
    data: {
      title: 'User permission system for reports',
      description: 'Role-based access control for report visibility within the analytics portal.',
      projectId: project2.id,
      assignedToId: tom.id,
      status: 'IN_REVIEW',
      priority: 'HIGH',
      dueDate: daysFromNow(1),
    },
  });

  // OVERDUE task #2 — dueDate in past, already flagged OVERDUE
  const t2_4 = await prisma.task.create({
    data: {
      title: 'Export to CSV feature',
      description: 'Allow users to export filtered report data as CSV files.',
      projectId: project2.id,
      assignedToId: priya.id,
      status: 'OVERDUE',
      priority: 'MEDIUM',
      dueDate: daysAgo(5),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Alert threshold notifications',
      description: 'Send in-app notifications when KPI metrics breach configured thresholds.',
      projectId: project2.id,
      assignedToId: ravi.id,
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: daysFromNow(8),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Audit log for data access',
      description: 'Track who accessed which reports and when, stored in append-only audit table.',
      projectId: project2.id,
      assignedToId: nina.id,
      status: 'TODO',
      priority: 'LOW',
      dueDate: daysFromNow(21),
    },
  });

  console.log('✅ Project 2 tasks created');

  // ─── Tasks: Project 3 — Brightwave CMS Migration ──────────────────────────
  const t3_1 = await prisma.task.create({
    data: {
      title: 'Content inventory and audit',
      description: 'Audit all existing WordPress content, categorise posts, pages, and media.',
      projectId: project3.id,
      assignedToId: priya.id,
      status: 'DONE',
      priority: 'HIGH',
      dueDate: daysAgo(20),
    },
  });

  const t3_2 = await prisma.task.create({
    data: {
      title: 'Set up Contentful environment',
      description: 'Configure content models, locales, and environments in Contentful.',
      projectId: project3.id,
      assignedToId: tom.id,
      status: 'DONE',
      priority: 'HIGH',
      dueDate: daysAgo(12),
    },
  });

  const t3_3 = await prisma.task.create({
    data: {
      title: 'Build Next.js frontend scaffold',
      description: 'Scaffold Next.js app with Contentful SDK, routing, and layout components.',
      projectId: project3.id,
      assignedToId: nina.id,
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      dueDate: daysFromNow(4),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Migrate media assets to CDN',
      description: 'Transfer all WordPress media to Cloudflare R2 and update content references.',
      projectId: project3.id,
      assignedToId: ravi.id,
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: daysFromNow(7),
    },
  });

  const t3_5 = await prisma.task.create({
    data: {
      title: 'Redirect mapping for SEO',
      description: 'Create 301 redirect map from old WordPress URLs to new headless routes.',
      projectId: project3.id,
      assignedToId: priya.id,
      status: 'IN_REVIEW',
      priority: 'HIGH',
      dueDate: daysFromNow(2),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Performance testing and optimization',
      description: 'Run Lighthouse audits and optimize LCP, CLS, and FID scores.',
      projectId: project3.id,
      assignedToId: tom.id,
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: daysFromNow(16),
    },
  });

  console.log('✅ Project 3 tasks created');

  // ─── Activity Logs — pre-existing feed entries ────────────────────────────
  // These ensure the feed is not empty on first load
  const logs = [
    {
      projectId: project1.id,
      taskId: t1_1.id,
      userId: ravi.id,
      action: `completed task "${t1_1.title}"`,
      fromStatus: 'IN_REVIEW' as TaskStatus,
      toStatus: 'DONE' as TaskStatus,
      createdAt: daysAgo(10),
    },
    {
      projectId: project1.id,
      taskId: t1_2.id,
      userId: ravi.id,
      action: `moved "${t1_2.title}" from In Progress → In Review`,
      fromStatus: 'IN_PROGRESS' as TaskStatus,
      toStatus: 'IN_REVIEW' as TaskStatus,
      createdAt: daysAgo(1),
    },
    {
      projectId: project1.id,
      taskId: t1_3.id,
      userId: nina.id,
      action: `moved "${t1_3.title}" from To Do → In Progress`,
      fromStatus: 'TODO' as TaskStatus,
      toStatus: 'IN_PROGRESS' as TaskStatus,
      createdAt: daysAgo(2),
    },
    {
      projectId: project1.id,
      taskId: t1_5.id,
      userId: admin.id,
      action: `task "${t1_5.title}" was automatically marked as Overdue`,
      fromStatus: 'TODO' as TaskStatus,
      toStatus: 'OVERDUE' as TaskStatus,
      createdAt: daysAgo(3),
    },
    {
      projectId: project2.id,
      taskId: t2_1.id,
      userId: tom.id,
      action: `completed task "${t2_1.title}"`,
      fromStatus: 'IN_REVIEW' as TaskStatus,
      toStatus: 'DONE' as TaskStatus,
      createdAt: daysAgo(15),
    },
    {
      projectId: project2.id,
      taskId: t2_2.id,
      userId: priya.id,
      action: `moved "${t2_2.title}" from To Do → In Progress`,
      fromStatus: 'TODO' as TaskStatus,
      toStatus: 'IN_PROGRESS' as TaskStatus,
      createdAt: daysAgo(3),
    },
    {
      projectId: project2.id,
      taskId: t2_3.id,
      userId: tom.id,
      action: `moved "${t2_3.title}" from In Progress → In Review`,
      fromStatus: 'IN_PROGRESS' as TaskStatus,
      toStatus: 'IN_REVIEW' as TaskStatus,
      createdAt: daysAgo(1),
    },
    {
      projectId: project2.id,
      taskId: t2_4.id,
      userId: admin.id,
      action: `task "${t2_4.title}" was automatically marked as Overdue`,
      fromStatus: 'IN_PROGRESS' as TaskStatus,
      toStatus: 'OVERDUE' as TaskStatus,
      createdAt: daysAgo(5),
    },
    {
      projectId: project3.id,
      taskId: t3_1.id,
      userId: priya.id,
      action: `completed task "${t3_1.title}"`,
      fromStatus: 'IN_REVIEW' as TaskStatus,
      toStatus: 'DONE' as TaskStatus,
      createdAt: daysAgo(20),
    },
    {
      projectId: project3.id,
      taskId: t3_2.id,
      userId: tom.id,
      action: `completed task "${t3_2.title}"`,
      fromStatus: 'IN_REVIEW' as TaskStatus,
      toStatus: 'DONE' as TaskStatus,
      createdAt: daysAgo(12),
    },
    {
      projectId: project3.id,
      taskId: t3_3.id,
      userId: nina.id,
      action: `moved "${t3_3.title}" from To Do → In Progress`,
      fromStatus: 'TODO' as TaskStatus,
      toStatus: 'IN_PROGRESS' as TaskStatus,
      createdAt: daysAgo(4),
    },
    {
      projectId: project3.id,
      taskId: t3_5.id,
      userId: priya.id,
      action: `moved "${t3_5.title}" from In Progress → In Review`,
      fromStatus: 'IN_PROGRESS' as TaskStatus,
      toStatus: 'IN_REVIEW' as TaskStatus,
      createdAt: daysAgo(1),
    },
  ];

  for (const log of logs) {
    await prisma.activityLog.create({ data: log });
  }

  console.log('✅ Activity logs created');

  // ─── Notifications ────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        recipientId: ravi.id,
        taskId: t1_2.id,
        type: 'TASK_ASSIGNED',
        message: `You were assigned to task "${t1_2.title}"`,
        read: false,
      },
      {
        recipientId: nina.id,
        taskId: t1_3.id,
        type: 'TASK_ASSIGNED',
        message: `You were assigned to task "${t1_3.title}"`,
        read: true,
      },
      {
        recipientId: pm1.id,
        taskId: t1_2.id,
        type: 'TASK_IN_REVIEW',
        message: `Task "${t1_2.title}" is ready for review`,
        read: false,
      },
      {
        recipientId: pm1.id,
        taskId: t2_3.id,
        type: 'TASK_IN_REVIEW',
        message: `Task "${t2_3.title}" is ready for review`,
        read: false,
      },
      {
        recipientId: priya.id,
        taskId: t2_2.id,
        type: 'TASK_ASSIGNED',
        message: `You were assigned to task "${t2_2.title}"`,
        read: true,
      },
      {
        recipientId: pm2.id,
        taskId: t3_5.id,
        type: 'TASK_IN_REVIEW',
        message: `Task "${t3_5.title}" is ready for review`,
        read: false,
      },
    ],
  });

  console.log('✅ Notifications created');

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log('\n🎉 Seed complete!\n');
  console.log('─────────────────────────────────────────────');
  console.log('Login credentials (all passwords: Password123!)');
  console.log('─────────────────────────────────────────────');
  console.log(`Admin:              admin@velozity.dev`);
  console.log(`Project Manager 1:  sarah.pm@velozity.dev`);
  console.log(`Project Manager 2:  james.pm@velozity.dev`);
  console.log(`Developer 1:        ravi.dev@velozity.dev`);
  console.log(`Developer 2:        nina.dev@velozity.dev`);
  console.log(`Developer 3:        tom.dev@velozity.dev`);
  console.log(`Developer 4:        priya.dev@velozity.dev`);
  console.log('─────────────────────────────────────────────');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
