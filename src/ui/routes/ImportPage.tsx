import { useEffect, useRef, useState } from "react";
import type { RecipeService } from "../../services/recipeService";
import { RecipeSaveError } from "../../domain/repositories/RecipeApiRepository";

const urlMessage =
  "Source URL must include a valid domain (such as example.com) or be empty.";
const servingsMessage =
  "Serving Size must be an integer between -2147483648 and 2147483647.";

// Grid layout puts each label above its field with a small, consistent gap.
const fieldStyle = { display: "grid", gap: "0.5rem" } as const;

function normalizeSourceUrl(value: string): string | null {
  const scheme = value.match(/^https?:\/\//i);
  const singleSlashScheme = value.match(/^https?:\/(?!\/)/i);
  const url = scheme
    ? value
    : singleSlashScheme
      ? `https://${value.slice(singleSlashScheme[0].length)}`
      : `https://${value}`;
  try {
    const hostname = new URL(url).hostname;
    return /^https?:\/\/[^/\s]/i.test(url) && /\.[^.]+$/.test(hostname)
      ? url
      : null;
  } catch {
    return null;
  }
}

export default function ImportPage({
  recipeService,
}: {
  recipeService: RecipeService;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);

  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const submitting = useRef(false);
  const savedMessage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focusing also brings the confirmation into view after saving at the bottom.
    if (saved) savedMessage.current?.focus();
  }, [saved]);

  // Immediate input feedback; the Edge Function independently enforces the rules.
  function validate(form: HTMLFormElement) {
    const nextErrors: Record<string, string> = {};
    const fields = Array.from(form.elements).filter(
      (element): element is HTMLInputElement | HTMLTextAreaElement =>
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement,
    );
    for (const field of fields) {
      if (field.required && !field.value.trim()) {
        const label = document
          .getElementById(`${field.name}-label`)
          ?.textContent?.replace(" (Required)", "");
        nextErrors[field.name] = `${label} is required.`;
      } else if (field.name === "source" && field.value.trim()) {
        if (!normalizeSourceUrl(field.value.trim())) {
          nextErrors.source = urlMessage;
        }
      } else if (field.name === "servingSize") {
        const value = field.value.trim();
        const servings = Number(value);
        if (
          !/^[+-]?\d+$/.test(value) ||
          !Number.isInteger(servings) ||
          servings < -2147483648 ||
          servings > 2147483647
        )
          nextErrors.servingSize = servingsMessage;
      } else if (
        (field.name === "title" || field.name === "prepTime") &&
        field.value.trim().length > 45
      ) {
        nextErrors[field.name] = "Use 45 characters or fewer.";
      }
    }
    setErrors(nextErrors);
    setChecked(true);
    fields.find((field) => nextErrors[field.name])?.focus();
    return Object.keys(nextErrors).length === 0;
  }

  async function save(form: HTMLFormElement) {
    if (submitting.current) return;
    setSaved(false);
    setSaveError(null);
    if (!validate(form)) return;
    const values = new FormData(form);
    const text = (name: string) => String(values.get(name) ?? "").trim();
    const sourceUrl = text("source");
    submitting.current = true;
    setPending(true);
    try {
      await recipeService.create({
        title: text("title"),
        prepTime: text("prepTime"),
        servings: Number(text("servingSize")),
        ingredients: text("ingredients"),
        instructions: text("directions"),
        mealType: text("mealType"),
        course: text("course"),
        url: sourceUrl ? normalizeSourceUrl(sourceUrl)! : "",
        note: text("notes"),
        nutritionInfo: text("nutrition"),
      });
      form.reset();
      setSaved(true);
    } catch (failure) {
      if (
        failure instanceof RecipeSaveError &&
        failure.code === "invalid_input" &&
        failure.field
      ) {
        const fieldNames: Record<string, string> = {
          url: "source",
          servings: "servingSize",
          instructions: "directions",
          note: "notes",
          nutritionInfo: "nutrition",
        };
        const field = fieldNames[failure.field] ?? failure.field;
        setErrors({
          [field]:
            field === "source"
              ? urlMessage
              : field === "servingSize"
                ? servingsMessage
                : "Check this field and try again.",
        });
      } else {
        setSaveError(
          failure instanceof RecipeSaveError && failure.code === "unauthorized"
            ? "Your session has expired. Please log in again."
            : failure instanceof RecipeSaveError &&
                failure.code === "profile_not_found"
              ? "Your account profile is missing. Contact your Cookmarked administrator."
              : "Unable to save recipe. Please try again.",
        );
      }
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  function validationAttributes(name: string) {
    return {
      "aria-labelledby": `${name}-label`,
      "aria-invalid": errors[name] ? true : undefined,
      "aria-describedby": errors[name] ? `${name}-error` : undefined,
    } as const;
  }

  function fieldError(name: string) {
    return errors[name] ? (
      <span id={`${name}-error`} className="editor-field-error">
        {errors[name]}
      </span>
    ) : null;
  }

  return (
    <section
      className="page-panel recipe-editor"
      aria-labelledby="import-heading"
    >
      <p className="eyebrow">Editor Form</p>
      {/* Keep the page name available to screen readers while showing the form title. */}
      <h2 id="import-heading" className="sr-only">
        Import
      </h2>
      <h3 id="recipe-heading">New Recipe</h3>
      <form
        className="recipe-editor-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save(event.currentTarget);
        }}
        onReset={() => {
          setErrors({});
          setChecked(false);
          setSaved(false);
          setSaveError(null);
        }}
      >
        {saveError && (
          <div className="editor-feedback editor-validation-error" role="alert">
            {saveError}
          </div>
        )}
        {checked && Object.keys(errors).length > 0 && (
          <div className="editor-feedback editor-validation-error" role="alert">
            Cannot save recipe. Fix the highlighted fields below.
          </div>
        )}
        {saved && (
          <div
            className="editor-feedback editor-success"
            role="status"
            tabIndex={-1}
            ref={savedMessage}
          >
            Recipe saved
          </div>
        )}
        {/* Wrapping each control in its label associates that label with only that field. */}
        <label className="editor-field" style={fieldStyle}>
          <span id="source-label">Source URL</span>
          <input type="url" name="source" {...validationAttributes("source")} />
          {fieldError("source")}
        </label>
        <label className="editor-field" style={fieldStyle}>
          <span id="title-label">
            Recipe Title <span className="field-hint">(Required)</span>
          </span>
          <input
            type="text"
            name="title"
            maxLength={45}
            {...validationAttributes("title")}
            required
          />
          {fieldError("title")}
        </label>
        <div className="editor-field-row">
          <label className="editor-field" style={fieldStyle}>
            <span>Meal Type</span>
            <select name="mealType" defaultValue="">
              <option value="">Select meal type</option>
              <option>Breakfast</option>
              <option>Lunch</option>
              <option>Dinner</option>
              <option>Supper</option>
              <option>Snack</option>
            </select>
          </label>
          <label className="editor-field" style={fieldStyle}>
            <span>Course</span>
            <select name="course" defaultValue="">
              <option value="">Select course</option>
              <option>Dessert</option>
              <option>Entree</option>
              <option>Side</option>
              <option>Beverage</option>
              <option>Appetizer</option>
            </select>
          </label>
        </div>
        <div className="editor-field-row">
          <label className="editor-field" style={fieldStyle}>
            <span id="prepTime-label">
              Prep Time <span className="field-hint">(Required)</span>
            </span>
            <input
              type="text"
              name="prepTime"
              maxLength={45}
              {...validationAttributes("prepTime")}
              required
              placeholder="e.g. 30 min"
            />
            {fieldError("prepTime")}
          </label>
          <label className="editor-field" style={fieldStyle}>
            <span id="servingSize-label">
              Serving Size <span className="field-hint">(Required)</span>
            </span>
            <input
              type="text"
              name="servingSize"
              {...validationAttributes("servingSize")}
              required
              inputMode="numeric"
              placeholder="e.g. 4"
            />
            {fieldError("servingSize")}
          </label>
        </div>
        <label className="editor-field" style={fieldStyle}>
          <span id="ingredients-label">
            Ingredients <span className="field-hint">(Required)</span>
          </span>
          <textarea
            name="ingredients"
            {...validationAttributes("ingredients")}
            required
            rows={5}
          />
          {fieldError("ingredients")}
        </label>
        <label className="editor-field" style={fieldStyle}>
          <span id="directions-label">
            Directions <span className="field-hint">(Required)</span>
          </span>
          <textarea
            name="directions"
            {...validationAttributes("directions")}
            required
            rows={5}
          />
          {fieldError("directions")}
        </label>
        <label className="editor-field" style={fieldStyle}>
          <span>Nutritional Information</span>
          <textarea name="nutrition" rows={4} />
        </label>
        <label className="editor-field" style={fieldStyle}>
          <span>Notes</span>
          <textarea name="notes" rows={4} />
        </label>
        <div className="editor-actions">
          <button className="filter-chip" type="reset" disabled={pending}>
            Clear
          </button>
          <button
            className="filter-chip active"
            type="submit"
            disabled={pending}
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </section>
  );
}
