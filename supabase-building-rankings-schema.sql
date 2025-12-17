-- Building Rankings Schema
-- Calculates daily building rankings based on total points from users in each building

-- Function to get building rankings for today
-- Returns buildings sorted by total points (sum of all users' total_points in that building today)
CREATE OR REPLACE FUNCTION get_building_rankings_today()
RETURNS TABLE (
  building_id TEXT,
  total_points BIGINT,
  total_users BIGINT,
  rank_position BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH building_scores AS (
    SELECT 
      ubs.building_id,
      COALESCE(SUM(p.total_points), 0) as total_points,
      COUNT(DISTINCT ubs.user_id) as total_users
    FROM user_building_sessions ubs
    LEFT JOIN profiles p ON ubs.user_id = p.user_id
    WHERE ubs.date = CURRENT_DATE
    GROUP BY ubs.building_id
  )
  SELECT 
    bs.building_id,
    bs.total_points,
    bs.total_users,
    ROW_NUMBER() OVER (ORDER BY bs.total_points DESC) as rank_position
  FROM building_scores bs
  ORDER BY bs.total_points DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get a specific building's rank and stats for today
CREATE OR REPLACE FUNCTION get_building_rank_today(building_id_param TEXT)
RETURNS TABLE (
  building_id TEXT,
  total_points BIGINT,
  total_users BIGINT,
  rank_position BIGINT,
  points_today BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH building_scores AS (
    SELECT 
      ubs.building_id,
      COALESCE(SUM(p.total_points), 0) as total_points,
      COUNT(DISTINCT ubs.user_id) as total_users,
      -- For now, points_today is 0 (we don't track daily points separately)
      -- In the future, this could be calculated from a daily_activities table
      0::BIGINT as points_today
    FROM user_building_sessions ubs
    LEFT JOIN profiles p ON ubs.user_id = p.user_id
    WHERE ubs.date = CURRENT_DATE
    GROUP BY ubs.building_id
  ),
  ranked_buildings AS (
    SELECT 
      bs.building_id,
      bs.total_points,
      bs.total_users,
      bs.points_today,
      ROW_NUMBER() OVER (ORDER BY bs.total_points DESC) as rank_position
    FROM building_scores bs
  )
  SELECT 
    rb.building_id,
    rb.total_points,
    rb.total_users,
    rb.rank_position,
    rb.points_today
  FROM ranked_buildings rb
  WHERE rb.building_id = building_id_param;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

