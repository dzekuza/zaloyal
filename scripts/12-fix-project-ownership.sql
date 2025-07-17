-- Fix project ownership to match quest creators
-- This script updates project ownership to match the quest creator

UPDATE projects 
SET owner_id = quests.creator_id
FROM quests 
WHERE projects.id = quests.project_id 
AND quests.project_id IS NOT NULL;

-- Verify the fix
SELECT 
  q.id as quest_id,
  q.title as quest_title,
  q.creator_id as quest_creator,
  p.id as project_id,
  p.name as project_name,
  p.owner_id as project_owner
FROM quests q
LEFT JOIN projects p ON q.project_id = p.id
WHERE q.project_id IS NOT NULL; 