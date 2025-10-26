import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexes1703000000000 implements MigrationInterface {
    name = 'AddPerformanceIndexes1703000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // User-related indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_email_lower" ON "user" (LOWER("email"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_username_lower" ON "user" (LOWER("username"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_team_id" ON "user" ("teamId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_verified_status" ON "user" ("isVerified")`);

        // Project-related indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_owner_id" ON "project" ("ownerId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_team_id" ON "project" ("teamId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_archived" ON "project" ("archived")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_favorite" ON "project" ("favorite")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_created_at" ON "project" ("createdAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_owner_archived" ON "project" ("ownerId", "archived")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_team_archived" ON "project" ("teamId", "archived")`);

        // Task-related indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_task_project_id" ON "task" ("projectId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_task_assignee_id" ON "task" ("assigneeId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_task_milestone_id" ON "task" ("milestoneId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_task_status" ON "task" ("status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_task_priority" ON "task" ("priority")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_task_due_date" ON "task" ("dueDate")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_task_created_at" ON "task" ("createdAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_task_project_status" ON "task" ("projectId", "status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_task_assignee_status" ON "task" ("assigneeId", "status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_task_project_assignee" ON "task" ("projectId", "assigneeId")`);

        // Comment-related indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comment_task_id" ON "comment" ("taskId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comment_author_id" ON "comment" ("authorId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comment_thread_id" ON "comment" ("threadId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comment_parent_id" ON "comment" ("parentCommentId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comment_created_at" ON "comment" ("createdAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comment_task_created" ON "comment" ("taskId", "createdAt")`);

        // Milestone-related indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_milestone_project_id" ON "milestone" ("projectId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_milestone_due_date" ON "milestone" ("dueDate")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_milestone_progress" ON "milestone" ("progressPercent")`);

        // Notification-related indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_user_id" ON "notification" ("userId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_project_id" ON "notification" ("projectId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_task_id" ON "notification" ("taskId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_type" ON "notification" ("type")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_read" ON "notification" ("read")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_channel" ON "notification" ("channel")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_created_at" ON "notification" ("createdAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_user_read" ON "notification" ("userId", "read")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_user_type" ON "notification" ("userId", "type")`);

        // Organization and Team indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organization_owner_id" ON "organization" ("ownerUserId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organization_name_lower" ON "organization" ("nameLower")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_team_org_id" ON "team" ("orgId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_team_name_lower" ON "team" ("nameLower")`);

        // Membership indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_membership_user_id" ON "membership" ("userId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_membership_org_id" ON "membership" ("orgId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_membership_team_id" ON "membership" ("teamId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_membership_role" ON "membership" ("role")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_membership_user_org" ON "membership" ("userId", "orgId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_membership_user_team" ON "membership" ("userId", "teamId")`);

        // Attachment indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_attachment_task_id" ON "attachment" ("taskId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_attachment_project_id" ON "attachment" ("projectId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_attachment_mime_type" ON "attachment" ("mimeType")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_attachment_created_at" ON "attachment" ("createdAt")`);

        // File version indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_file_version_attachment_id" ON "file_version" ("attachmentId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_file_version_number" ON "file_version" ("versionNumber")`);

        // Thread indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_thread_task_id" ON "thread" ("taskId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_thread_root_comment_id" ON "thread" ("rootCommentId")`);

        // Security and authentication indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_refresh_token_user_id" ON "refresh_token" ("userId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_refresh_token_expires_at" ON "refresh_token" ("expiresAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_refresh_token_revoked" ON "refresh_token" ("isRevoked")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_refresh_token_user_revoked" ON "refresh_token" ("userId", "isRevoked")`);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_email_verification_user_id" ON "email_verification_code" ("userId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_email_verification_expires_at" ON "email_verification_code" ("expiresAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_email_verification_used" ON "email_verification_code" ("isUsed")`);

        // Notification preference indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_preference_user_id" ON "notification_preference" ("userId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_preference_type" ON "notification_preference" ("type")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_preference_channel" ON "notification_preference" ("channel")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_preference_enabled" ON "notification_preference" ("enabled")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop all indexes in reverse order
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_preference_enabled"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_preference_channel"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_preference_type"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_preference_user_id"`);

        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_email_verification_used"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_email_verification_expires_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_email_verification_user_id"`);

        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_token_user_revoked"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_token_revoked"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_token_expires_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_token_user_id"`);

        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_thread_root_comment_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_thread_task_id"`);

        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_file_version_number"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_file_version_attachment_id"`);

        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attachment_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attachment_mime_type"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attachment_project_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attachment_task_id"`);

        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_membership_user_team"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_membership_user_org"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_membership_role"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_membership_team_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_membership_org_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_membership_user_id"`);

        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_team_name_lower"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_team_org_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_organization_name_lower"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_organization_owner_id"`);

        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_user_type"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_user_read"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_channel"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_read"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_type"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_task_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_project_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_user_id"`);

        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_milestone_progress"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_milestone_due_date"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_milestone_project_id"`);

        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comment_task_created"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comment_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comment_parent_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comment_thread_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comment_author_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comment_task_id"`);

        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_project_assignee"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_assignee_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_project_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_due_date"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_priority"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_milestone_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_assignee_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_project_id"`);

        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_project_team_archived"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_project_owner_archived"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_project_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_project_favorite"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_project_archived"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_project_team_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_project_owner_id"`);

        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_verified_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_team_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_username_lower"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_email_lower"`);
    }
}