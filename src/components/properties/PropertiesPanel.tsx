// Right sidebar — renders the selected node's template properties. See
// docs/plan.md Phase 6. Folders never have properties (mirrors the
// prototype's `if (template.isFolder) return null`), and nothing renders
// when no node is selected.
import { FOLDER_TEMPLATE_KEY } from "../../constants/schema";
import { PROPERTY_SCHEMAS } from "../../constants/templates";
import { useProject } from "../../hooks/use-project";
import { DateProperty } from "./DateProperty";
import { ImageSlot } from "./ImageSlot";
import { RefsProperty } from "./RefsProperty";
import { TagsProperty } from "./TagsProperty";
import { TextProperty } from "./TextProperty";
import "./properties.css";

export function PropertiesPanel() {
  const { project, nodes, updateNodeProperty, updateNodeTags } = useProject();
  const selectedId = project?.selectedId ?? null;
  const node = selectedId ? nodes[selectedId] : undefined;

  if (!node) {
    return (
      <div className="properties-panel-empty">
        <p>Select a page to see its properties.</p>
      </div>
    );
  }

  if (node.templateKey === FOLDER_TEMPLATE_KEY) {
    return (
      <div className="properties-panel-empty">
        <p>Folders don't have properties.</p>
      </div>
    );
  }

  const schema = PROPERTY_SCHEMAS[node.templateKey as keyof typeof PROPERTY_SCHEMAS] ?? [];
  // Fixed text/date fields (Summary, When) always render first, so they
  // never get shoved down the panel by a growing Friends/Participants list.
  // Tags stays last regardless.
  const fixedFields = schema.filter((prop) => prop.type !== "refs");
  const refFields = schema.filter((prop) => prop.type === "refs");

  function renderField(prop: (typeof schema)[number]) {
    const raw = node!.properties[prop.key];

    if (prop.type === "refs") {
      const nodeIds = Array.isArray(raw) ? (raw as string[]) : [];
      return (
        <RefsProperty
          key={prop.key}
          label={prop.label}
          nodeIds={nodeIds}
          excludeNodeId={node!.id}
          nodes={nodes}
          onChange={(next) => updateNodeProperty(node!.id, prop.key, next)}
        />
      );
    }

    if (prop.type === "date") {
      return (
        <DateProperty
          key={prop.key}
          label={prop.label}
          value={typeof raw === "string" ? raw : ""}
          placeholder={prop.placeholder}
          onChange={(value) => updateNodeProperty(node!.id, prop.key, value)}
        />
      );
    }

    return (
      <TextProperty
        key={prop.key}
        label={prop.label}
        value={typeof raw === "string" ? raw : ""}
        placeholder={prop.placeholder}
        multiline={prop.type === "longtext"}
        onChange={(value) => updateNodeProperty(node!.id, prop.key, value)}
      />
    );
  }

  return (
    <div className="properties-panel">
      <ImageSlot nodeId={node.id} image={node.image} />
      {fixedFields.map(renderField)}
      {refFields.map(renderField)}
      <TagsProperty label="Tags" tags={node.tags} onChange={(tags) => updateNodeTags(node.id, tags)} />
    </div>
  );
}
