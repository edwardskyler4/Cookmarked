// Grid layout puts each label above its field with a small, consistent gap.
const fieldStyle = { display: "grid", gap: "0.5rem" } as const;

export default function ImportPage() {
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
      <form className="recipe-editor-form">
        {/* Wrapping each control in its label associates that label with only that field. */}
        <label className="editor-field" style={fieldStyle}>
          <span>Source URL</span>
          <input type="url" name="source" />
        </label>
        <label className="editor-field" style={fieldStyle}>
          <span>
            Recipe Title <span className="field-hint">(Required)</span>
          </span>
          <input type="text" name="title" required />
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
            <span>
              Prep Time <span className="field-hint">(Required)</span>
            </span>
            <input
              type="text"
              name="prepTime"
              required
              placeholder="e.g. 30 min"
            />
          </label>
          <label className="editor-field" style={fieldStyle}>
            <span>
              Serving Size <span className="field-hint">(Required)</span>
            </span>
            <input
              type="text"
              name="servingSize"
              required
              placeholder="e.g. 4 servings"
            />
          </label>
        </div>
        <label className="editor-field" style={fieldStyle}>
          <span>
            Ingredients <span className="field-hint">(Required)</span>
          </span>
          <textarea name="ingredients" required rows={5} />
        </label>
        <label className="editor-field" style={fieldStyle}>
          <span>
            Directions <span className="field-hint">(Required)</span>
          </span>
          <textarea name="directions" required rows={5} />
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
          <button className="filter-chip active" type="button">
            Save
          </button>
        </div>
      </form>
    </section>
  );
}
