-- Add trigger to automatically create user records when someone signs up

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, email, name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also create a function to manually create missing user records
CREATE OR REPLACE FUNCTION public.create_missing_users()
RETURNS TEXT AS $$
DECLARE
  auth_user_record RECORD;
  created_count INTEGER := 0;
BEGIN
  FOR auth_user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.auth_user_id
    WHERE pu.auth_user_id IS NULL
  LOOP
    INSERT INTO public.users (auth_user_id, email, name)
    VALUES (
      auth_user_record.id,
      auth_user_record.email,
      COALESCE(auth_user_record.raw_user_meta_data->>'name', split_part(auth_user_record.email, '@', 1))
    );
    created_count := created_count + 1;
  END LOOP;
  
  RETURN 'Created ' || created_count || ' missing user records';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to create missing users
SELECT public.create_missing_users();