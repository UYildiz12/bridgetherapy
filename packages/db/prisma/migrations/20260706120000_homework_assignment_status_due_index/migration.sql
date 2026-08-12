-- The reminder cron scans assignments by status + due-date window every run;
-- give that query an index instead of a table scan.
CREATE INDEX "HomeworkAssignment_status_dueDate_idx" ON "HomeworkAssignment"("status", "dueDate");
