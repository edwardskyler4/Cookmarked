// Every deployed endpoint must declare its access and methods here.
export const endpointPolicies = {
  auth: { access: "credentials", methods: ["POST"] },
  recipes: { access: "user", methods: ["GET", "DELETE"] },
  recipes_save: { access: "user", methods: ["POST"] },
  temp_recipes: { access: "user", methods: ["GET", "DELETE"] },
  recipe_metadata: { access: "user", methods: ["POST"] },
} as const;
export type UserEndpoint = Exclude<keyof typeof endpointPolicies, "auth">;
