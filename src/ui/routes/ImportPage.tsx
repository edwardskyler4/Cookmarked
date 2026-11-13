import { useEffect, useRef, useState } from "react";
import type { RecipeService } from "../../services/recipeService";
import { RecipeSaveError } from "../../domain/repositories/RecipeApiRepository";
import type { TempRecipe } from "../../domain/models/TempRecipe";
import type { RecipeMetadataService } from "../../services/recipeMetadataService";

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

function isValidThumbnailUrl(value: string): boolean {
  if (!value.trim()) return true;

  try {
    const url = new URL(value.trim());

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      /^[^.]+\..+/.test(url.hostname) &&
      !url.hostname.endsWith(".")
    );
  } catch {
    return false;
  }
}


export default function ImportPage({
  recipeService,
  recipeMetadataService,
  tempRecipe,
  saveRecipe,
  onSaved,
}: {
  recipeService: RecipeService;
  recipeMetadataService: RecipeMetadataService;
  tempRecipe?: TempRecipe;
  saveRecipe?: RecipeService["create"];
  onSaved?: () => void | Promise<void>;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);

  const [metadata, setMetadata] = useState<{
    platform: string;
    sourceUrl: string;
  } | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const submitting = useRef(false);
  const savedMessage = useRef<HTMLDivElement>(null);
  const metadataRequestId = useRef(0);

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
      else if (
        field.name === "thumbnailUrl" &&
        field.value.trim() &&
        !isValidThumbnailUrl(field.value)
      ) {
        nextErrors.thumbnailUrl = "Enter a valid HTTP or HTTPS thumbnail URL.";
      }
    }
    setErrors(nextErrors);
    setChecked(true);
    fields.find((field) => nextErrors[field.name])?.focus();
    return Object.keys(nextErrors).length === 0;
  }

    async function checkMetadata(source: string) {
      const requestId = ++metadataRequestId.current;
      const normalizedUrl = normalizeSourceUrl(source.trim());

    if (!source.trim()) {
      setMetadata(null);
      setMetadataError(null);
      setMetadataLoading(false);
      return;
    }

    if (!normalizedUrl) {
      setMetadata(null);
      setMetadataError(urlMessage);
      setMetadataLoading(false);
      return;
    }

    setMetadata(null);
    setMetadataLoading(true);
    setMetadataError(null);

    try {
      const result = await recipeMetadataService.getMetadata(normalizedUrl);

      if (requestId !== metadataRequestId.current) return;

      setMetadata({
        platform: result.platform,
        sourceUrl: result.sourceUrl,
      });
    } catch {
      if (requestId !== metadataRequestId.current) return;

      setMetadata(null);
      setMetadataError(
        "Unable to check this link. You can still enter the recipe manually.",
      );
    } finally {
      if (requestId === metadataRequestId.current) {
      setMetadataLoading(false);
      }
    }
  }

  async function save(form: HTMLFormElement) {
    if (submitting.current) return;
    setSaved(false);
    setSaveError(null);
    if (!validate(form)) return;
    const values = new FormData(form);
    const text = (name: string) => String(values.get(name) ?? "").trim();
    const sourceUrl = text("source");
    const normalizedSourceUrl = sourceUrl
      ? normalizeSourceUrl(sourceUrl)!
      : "";
    const matchingMetadata =
      metadata?.sourceUrl === normalizedSourceUrl ? metadata : null;
    submitting.current = true;
    setPending(true);
    try {
      const draft = {
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
        description: text("description"),
        sharedFromPlatform:
          matchingMetadata?.platform ??
          (normalizeSourceUrl(tempRecipe?.url ?? "") === normalizedSourceUrl
            ? tempRecipe?.sharedFromPlatform
            : "") ??
          "",
        thumbnailUrl: text("thumbnailUrl"),
      };
      await (saveRecipe ?? recipeService.create)(draft);
      metadataRequestId.current++;
      setMetadataLoading(false);
      form.reset();
      setMetadata(null);
      setMetadataError(null);
      setSaved(true);
      void onSaved?.();
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
    <section className="page-panel recipe-editor" aria-labelledby="add-heading">
      <p className="eyebrow">Editor Form</p>
      {/* Keep the page name available to screen readers while showing the form title. */}
      <h2 id="add-heading" className="sr-only">
        Add
      </h2>
      <h3 id="recipe-heading">New Recipe</h3>
      {tempRecipe && (
        <aside className="imported-recipe-reference" aria-labelledby="imported-recipe-heading">
          <p className="eyebrow">Imported reference</p>
          <h4 id="imported-recipe-heading">{tempRecipe.title}</h4>
          {tempRecipe.sharedFromPlatform && <p>Shared from {tempRecipe.sharedFromPlatform}</p>}
          {tempRecipe.url && (
            <p>
              <a href={tempRecipe.url} target="_blank" rel="noreferrer">
                Open original post
              </a>
            </p>
          )}
          {tempRecipe.text && (
            <div>
              <p>Imported text — copy only the details you want to keep:</p>
              <pre>{tempRecipe.text}</pre>
            </div>
          )}
        </aside>
      )}
      <form
        className="recipe-editor-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save(event.currentTarget);
        }}
        onReset={() => {
          metadataRequestId.current++;
          setMetadataLoading(false);
          setErrors({});
          setChecked(false);
          setSaved(false);
          setSaveError(null);
          setMetadata(null);
          setMetadataError(null);
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
          <input
            type="url"
            name="source"
            defaultValue={tempRecipe?.url ?? ""}
            onChange={() => {
              metadataRequestId.current++;
              setMetadata(null);
              setMetadataLoading(false);
              setMetadataError(null);
            }}
            onBlur={(event) => {
              void checkMetadata(event.currentTarget.value);
            }}
            {...validationAttributes("source")}
          />
          {fieldError("source")}
        </label>
        {metadataLoading && (
          <p role="status">Checking source link…</p>
        )}

        {metadata?.platform && (
          <p role="status">
            Detected platform: <strong>{metadata.platform}</strong>
          </p>
        )}

        {metadataError && (
          <p className="editor-field-error" role="alert">
            {metadataError}
          </p>
        )}
        
        <label className="editor-field" style={fieldStyle}>
          <span id="title-label">
            Recipe Title <span className="field-hint">(Required)</span>
          </span>
          <input
            type="text"
            name="title"
            maxLength={45}
            defaultValue={tempRecipe?.title ?? ""}
            {...validationAttributes("title")}
            required
          />
          {fieldError("title")}
        </label>
                <label className="editor-field" style={fieldStyle}>
          <span>Description</span>
          <textarea
            name="description"
            rows={3}
            placeholder="Describe the recipe..."
          />
        </label>

        <label className="editor-field" style={fieldStyle}>
          <span id="thumbnailUrl-label">Thumbnail URL</span>
          <input
            type="url"
            name="thumbnailUrl"
            defaultValue={tempRecipe?.thumbnailUrl ?? ""}
            placeholder="https://example.com/image.jpg"
            onChange={(event) => {
              const value = event.currentTarget.value;

              setErrors((previous) => {
                const next = { ...previous };

                if (!value.trim() || isValidThumbnailUrl(value)) {
                  delete next.thumbnailUrl;
                } else {
                  next.thumbnailUrl =
                    "Enter a valid HTTP or HTTPS thumbnail URL.";
                }

                return next;
              });
            }}
            {...validationAttributes("thumbnailUrl")}
          />
          {fieldError("thumbnailUrl")}
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
