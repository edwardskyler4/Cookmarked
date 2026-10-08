import { useState } from "react";

// Grid layout puts each label above its field with a small, consistent gap.
const fieldStyle = { display: "grid", gap: "0.5rem" } as const;

export default function ImportPage() {
  // `tag` is the text currently being typed; `tags` stores the added tags.
  const [tag, setTag] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // Trim extra spaces and skip empty or duplicate tags before adding one.
  function addTag() {
    const nextTag = tag.trim();
    if (nextTag && !tags.includes(nextTag)) {
      setTags([...tags, nextTag]);
      setTag("");
    }
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
      <form className="recipe-editor-form">
        {/* Wrapping each control in its label associates that label with only that field. */}
        <label className="editor-field" style={fieldStyle}>
          <span>Source</span>
          <input type="url" name="source" />
        </label>
        <label className="editor-field" style={fieldStyle}>
          <span>Title</span>
          <input type="text" name="title" />
        </label>
        <div className="editor-field" style={fieldStyle}>
          {/* htmlFor connects this label to the tag input by its id. */}
          <label htmlFor="recipe-tag">Tags</label>
          <div className="tag-entry">
            <input
              id="recipe-tag"
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              placeholder="Add a tag"
            />
            <button className="filter-chip" type="button" onClick={addTag}>
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <ul className="tag-list" aria-label="Recipe tags">
              {tags.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="editor-field-row">
          <label className="editor-field" style={fieldStyle}>
            <span>Prep time</span>
            <input type="text" name="prepTime" placeholder="e.g. 30 min" />
          </label>
          <label className="editor-field" style={fieldStyle}>
            <span>Serving size</span>
            <input
              type="text"
              name="servingSize"
              placeholder="e.g. 4 servings"
            />
          </label>
        </div>
        <label className="editor-field" style={fieldStyle}>
          <span>Ingredients</span>
          <textarea name="ingredients" rows={5} />
        </label>
        <label className="editor-field" style={fieldStyle}>
          <span>Directions</span>
          <textarea name="directions" rows={5} />
        </label>
        <label className="editor-field" style={fieldStyle}>
          <span>
            Nutrition <span className="field-hint">(optional)</span>
          </span>
          <textarea name="nutrition" rows={4} />
        </label>
        <label className="editor-field" style={fieldStyle}>
          <span>Notes</span>
          <textarea name="notes" rows={4} />
        </label>
        <div className="editor-actions">
          <button
            className="delete-recipe-button"
            type="button"
            aria-label="Delete recipe"
          >
            Delete
          </button>
        </div>
      </form>
    </section>
  );
}
