-- PostgreSQL schema for Supabase

-- -----------------------------------------------------
-- Table public.profile
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile (
  user_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  first_name VARCHAR(45),
  username VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- Table public.recipe
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recipe (
  recipe_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title VARCHAR(45) NOT NULL,
  description TEXT,
  ingredients TEXT,
  instructions TEXT,
  prep_time VARCHAR(45),
  cook_time VARCHAR(45),
  servings INTEGER,
  meal_type TEXT NOT NULL CHECK (
    meal_type IN ('Breakfast', 'Lunch', 'Dinner', 'Supper', 'Snack','N/A')
  ),
  course TEXT NOT NULL CHECK (
    course IN ('Dessert', 'Entree', 'Side', 'Beverage', 'Appetizer','N/A')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shared_from_platform TEXT,
  url TEXT,
  media_type VARCHAR(45),
  thumbnail_url TEXT,
  CONSTRAINT fk_recipe_profile
    FOREIGN KEY (user_id)
    REFERENCES public.profile (user_id)
    ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS idx_recipe_user_id
  ON public.recipe (user_id);

-- -----------------------------------------------------
-- Table public.temp_recipe
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.temp_recipe (
  recipe_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title VARCHAR(45) NOT NULL,
  text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shared_from_platform TEXT,
  url TEXT,
  media_type VARCHAR(45),
  thumbnail_url TEXT,
  CONSTRAINT fk_temp_recipe_profile
    FOREIGN KEY (user_id)
    REFERENCES public.profile (user_id)
    ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS idx_temp_recipe_user_id
  ON public.temp_recipe (user_id);

-- -----------------------------------------------------
-- Table public.meal_plan
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_plan (
  meal_plan_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  week_start_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id INTEGER NOT NULL,
  CONSTRAINT fk_meal_plan_profile
    FOREIGN KEY (user_id)
    REFERENCES public.profile (user_id)
    ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS idx_meal_plan_user_id
  ON public.meal_plan (user_id);

-- -----------------------------------------------------
-- Table public.meal_plan_entries
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_plan_entries (
  meal_plan_entry_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipe_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  meal_plan_id INTEGER NOT NULL,
  date_planned DATE,
  meal_type TEXT NOT NULL CHECK (
    meal_type IN ('Breakfast', 'Lunch', 'Dinner', 'Supper', 'Snack')
  ),
  course TEXT NOT NULL CHECK (
    course IN ('Dessert', 'Entree', 'Side', 'Beverage', 'Appetizer')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_meal_plan_entry_recipe
    FOREIGN KEY (recipe_id)
    REFERENCES public.recipe (recipe_id)
    ON DELETE NO ACTION,
  CONSTRAINT fk_meal_plan_entry_profile
    FOREIGN KEY (user_id)
    REFERENCES public.profile (user_id)
    ON DELETE NO ACTION,
  CONSTRAINT fk_meal_plan_entry_meal_plan
    FOREIGN KEY (meal_plan_id)
    REFERENCES public.meal_plan (meal_plan_id)
    ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS idx_meal_plan_entries_recipe_id
  ON public.meal_plan_entries (recipe_id);

CREATE INDEX IF NOT EXISTS idx_meal_plan_entries_user_id
  ON public.meal_plan_entries (user_id);

CREATE INDEX IF NOT EXISTS idx_meal_plan_entries_meal_plan_id
  ON public.meal_plan_entries (meal_plan_id);

