-- RPC function to enqueue a verification
CREATE OR REPLACE FUNCTION enqueue_verification(
  p_task_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_existing_verification task_verifications%ROWTYPE;
  v_social_account social_accounts%ROWTYPE;
  v_cache_key text;
  v_cached_result jsonb;
  v_result jsonb;
BEGIN
  -- Get the task
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Task not found');
  END IF;

  -- Check if user has social account for this platform
  SELECT * INTO v_social_account 
  FROM social_accounts 
  WHERE user_id = p_user_id AND platform = 'x';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', 'No X account linked. Please link your X account first.',
      'status', 'no_account'
    );
  END IF;

  -- Check if verification already exists
  SELECT * INTO v_existing_verification 
  FROM task_verifications 
  WHERE task_id = p_task_id AND user_id = p_user_id;
  
  IF FOUND THEN
    -- Return existing verification status
    RETURN jsonb_build_object(
      'verification_id', v_existing_verification.id,
      'status', v_existing_verification.status,
      'result', v_existing_verification.result,
      'attempts', v_existing_verification.attempts,
      'last_attempt', v_existing_verification.last_attempt
    );
  END IF;

  -- Check cache first
  v_cache_key := p_user_id::text || '_' || p_task_id::text || '_' || v_task.social_action;
  SELECT cache_value INTO v_cached_result 
  FROM social_verification_cache 
  WHERE cache_key = v_cache_key AND expires_at > now();
  
  IF v_cached_result IS NOT NULL THEN
    -- Return cached result
    RETURN jsonb_build_object(
      'status', 'cached',
      'result', v_cached_result,
      'cached', true
    );
  END IF;

  -- Create new verification
  INSERT INTO task_verifications (
    task_id, 
    user_id, 
    status, 
    attempts, 
    last_attempt,
    result
  ) VALUES (
    p_task_id, 
    p_user_id, 
    'pending', 
    0, 
    now(),
    jsonb_build_object('enqueued_at', now())
  ) RETURNING * INTO v_existing_verification;

  RETURN jsonb_build_object(
    'verification_id', v_existing_verification.id,
    'status', 'pending',
    'message', 'Verification enqueued successfully',
    'enqueued_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION enqueue_verification(uuid, uuid) TO authenticated;

-- Function to get verification status
CREATE OR REPLACE FUNCTION get_verification_status(
  p_task_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb AS $$
DECLARE
  v_verification task_verifications%ROWTYPE;
BEGIN
  SELECT * INTO v_verification 
  FROM task_verifications 
  WHERE task_id = p_task_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No verification found for this task');
  END IF;

  RETURN jsonb_build_object(
    'verification_id', v_verification.id,
    'status', v_verification.status,
    'result', v_verification.result,
    'attempts', v_verification.attempts,
    'last_attempt', v_verification.last_attempt,
    'created_at', v_verification.created_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_verification_status(uuid, uuid) TO authenticated; 