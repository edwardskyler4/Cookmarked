import { useState } from "react";

// Grid layout puts each label above its field with a small, consistent gap.
const fieldStyle = { display: "grid", gap: "0.5rem" } as const;

export default function ImportPage() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);

  // These are input-format checks only; no recipe is sent to storage.
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
      } else if (
        field instanceof HTMLInputElement &&
        field.validity.typeMismatch
      ) {
        nextErrors[field.name] = "Enter a valid Source URL or leave it blank.";
      }
    }
    setErrors(nextErrors);
    setChecked(true);
    fields.find((field) => nextErrors[field.name])?.focus();
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
        onReset={() => {
          setErrors({});
          setChecked(false);
        }}
      >
        {checked &&
          (Object.keys(errors).length > 0 ? (
            <div
              className="editor-feedback editor-validation-error"
              role="alert"
            >
              Cannot save recipe. Fix the highlighted fields below.
            </div>
          ) : (
            <div className="editor-feedback" role="status">
              Required fields are complete. This recipe has not been saved
              because saving is not connected yet.
            </div>
          ))}
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
              placeholder="e.g. 4 servings"
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
          <button className="filter-chip" type="reset">
            Clear
          </button>
          {/* Persistence will be connected in the next step. */}
          <button
            className="filter-chip active"
            type="button"
            onClick={(event) => validate(event.currentTarget.form!)}
          >
            Save
          </button>
        </div>
      </form>
    </section>
  );
}
