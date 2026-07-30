import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronRight, ChevronDown, Plus, Search, Filter,
  User, MapPin, Users, Package, Calendar, FileText, Folder as FolderIcon,
  Eye, EyeOff, Lock, Home, MoreHorizontal, PanelRight, X, Image as ImageIcon,
  Trash2, Copy, PencilLine, Sparkles
} from 'lucide-react';

// ============================================================
// TEMPLATES — the whole point of the exercise
// ============================================================

const TEMPLATES = {
  folder: {
    name: 'Folder',
    icon: 'folder',
    isFolder: true,
    tabs: [],
    properties: []
  },
  character: {
    name: 'Character',
    icon: 'user',
    tabs: [
      {
        id: 'overview',
        label: 'Overview',
        hidden: false,
        content: `<div class="cb cb-info">A brief description of your character.</div>
<div class="cb cb-quote">"Something the character has said."</div>
<h2>Description</h2>
<p>Your character's physical description; things like eye color, hair color, hair style, physical mannerisms, distinguishing features, fitness, strengths, and weaknesses.</p>
<h2>Traits and Motivations</h2>
<p>What is their personality type? Are they funny? Do they have a temper? Are they motivated to protect a loved one? Do they have particular virtues? Bad habits? Any fears or phobias?</p>
<h2>Routine</h2>
<p>What does your character's normal day look like? What do they do? What do they think about?</p>
<div class="cb cb-secret"><div class="cb-secret-label">🔒 SECRET</div>Content in this block is a secret; information that only admins can see. By the way, this is an example template! Modify it to fit your needs.</div>`
      },
      {
        id: 'backstory',
        label: 'Backstory',
        hidden: true,
        content: `<div class="cb cb-info">Their past. What made them who they are today.</div>
<h2>Early Life</h2>
<p>Where were they born? What was their childhood like? Who raised them, and how did that shape them?</p>
<h2>Formative Events</h2>
<p>What happened to make them who they are? Loss, love, trauma, triumph — the moments that carved out their personality.</p>
<h2>Recent Past</h2>
<p>What have they been up to leading into the current story?</p>`
      }
    ],
    properties: [
      { key: 'summary', type: 'text', label: 'Summary', placeholder: 'A one-line summary.' },
      { key: 'friends', type: 'refs', label: 'Friends' },
      { key: 'tags', type: 'tags', label: 'Tags' }
    ]
  },
  location: {
    name: 'Location',
    icon: 'map-pin',
    tabs: [
      {
        id: 'overview',
        label: 'Overview',
        hidden: false,
        content: `<div class="cb cb-info">A template for a specific location. For example, a bustling marketplace, a lonely shack in the countryside, a long-forgotten dungeon, or a derelict space station — anywhere that a meaningful scene could take place.</div>
<div class="cb cb-quote">"This is an interesting place." — Insightful Person</div>
<h2>Description</h2>
<p>Your location's physical description; what is this place? What's the environment like? Is it a populated or remote location? What's the local culture like? What's the first thing a visitor would notice about this place?</p>
<h2>Origin</h2>
<p>Why is this place here? What is its purpose? Is it naturally occurring or was it made? Why do people come here, if at all?</p>
<h2>Routine</h2>
<p>What does a normal day look like here?</p>
<div class="cb cb-secret"><div class="cb-secret-label">🔒 SECRET</div>Content in this block is a secret; information that only admins can see. By the way, this is an example template! Modify it to fit your needs.</div>`
      },
      {
        id: 'map',
        label: 'Map',
        hidden: false,
        content: `<div class="cb cb-info">A place for the location's map. Drop an image below, or leave it blank if the location doesn't need one.</div>
<p><em>Map placeholder — in the real build, this tab would render an interactive Leaflet map with pins.</em></p>`
      },
      {
        id: 'history',
        label: 'History',
        hidden: true,
        content: `<div class="cb cb-info">The location's past. Wars fought here, rulers who came and went, changes to the landscape.</div>
<h2>Founding</h2>
<p>How did this place come to be? Who made it, if anyone? When?</p>
<h2>Key Events</h2>
<p>What has happened here that matters? Battles, births, betrayals, discoveries.</p>
<h2>Recent History</h2>
<p>What's happened here in the last few years?</p>`
      }
    ],
    properties: [
      { key: 'summary', type: 'text', label: 'Summary', placeholder: 'A one-line summary.' },
      { key: 'parent_location', type: 'refs', label: 'Part of' },
      { key: 'tags', type: 'tags', label: 'Tags' }
    ]
  },
  faction: {
    name: 'Faction',
    icon: 'users',
    tabs: [
      {
        id: 'overview',
        label: 'Overview',
        hidden: false,
        content: `<div class="cb cb-info">A group of people united by a shared cause, ideology, or purpose. Guilds, cults, corporations, noble houses, criminal syndicates, revolutionary cells — whatever shape it takes.</div>
<div class="cb cb-quote">"Something a member has said, or something said about them."</div>
<h2>Purpose</h2>
<p>What does this faction stand for? What are their public goals? What are their private goals? How do they operate day-to-day?</p>
<h2>Structure</h2>
<p>How is the faction organized? Who leads it? Who's beneath them? How do you rise through the ranks?</p>
<h2>Reputation</h2>
<p>How is this faction perceived by the public? By other factions? By its enemies?</p>
<div class="cb cb-secret"><div class="cb-secret-label">🔒 SECRET</div>What's the real story here? What are they actually up to?</div>`
      },
      {
        id: 'members',
        label: 'Members',
        hidden: false,
        content: `<div class="cb cb-info">Notable members of this faction. Reference character pages here or just list names.</div>
<h2>Leadership</h2>
<p></p>
<h2>Notable Members</h2>
<p></p>
<h2>Former Members</h2>
<p></p>`
      }
    ],
    properties: [
      { key: 'summary', type: 'text', label: 'Summary', placeholder: 'A one-line summary.' },
      { key: 'leader', type: 'refs', label: 'Leader' },
      { key: 'members', type: 'refs', label: 'Members' },
      { key: 'tags', type: 'tags', label: 'Tags' }
    ]
  },
  item: {
    name: 'Item',
    icon: 'package',
    tabs: [
      {
        id: 'overview',
        label: 'Overview',
        hidden: false,
        content: `<div class="cb cb-info">An object of significance in your world. A weapon, an artifact, a family heirloom, a strange trinket found in a market stall.</div>
<div class="cb cb-quote">"Something said about this item, or by whoever holds it."</div>
<h2>Description</h2>
<p>What does this item look like? What's it made of? How big is it? Any distinguishing features — carvings, discoloration, damage?</p>
<h2>Function</h2>
<p>What does it do? How does it work? Are there rules for using it? Costs, dangers, limits?</p>
<h2>Origin</h2>
<p>Where did it come from? Who made it, if anyone? How did it end up where it is now?</p>
<div class="cb cb-secret"><div class="cb-secret-label">🔒 SECRET</div>What don't most people know about this item?</div>`
      },
      {
        id: 'history',
        label: 'History',
        hidden: true,
        content: `<div class="cb cb-info">The item's past owners and where it's been.</div>
<h2>Previous Owners</h2>
<p>Who has held this item before? How did it change hands?</p>
<h2>Notable Uses</h2>
<p>When has this item been used, and to what effect?</p>`
      }
    ],
    properties: [
      { key: 'summary', type: 'text', label: 'Summary', placeholder: 'A one-line summary.' },
      { key: 'owner', type: 'refs', label: 'Current Owner' },
      { key: 'tags', type: 'tags', label: 'Tags' }
    ]
  },
  event: {
    name: 'Event',
    icon: 'calendar',
    tabs: [
      {
        id: 'overview',
        label: 'Overview',
        hidden: false,
        content: `<div class="cb cb-info">Something that happened, or is happening, or will happen. A battle, a coronation, a heist, a first meeting.</div>
<div class="cb cb-quote">"Something said during or about the event."</div>
<h2>Summary</h2>
<p>What happened, in a sentence or two?</p>
<h2>Context</h2>
<p>What led up to this? What made it possible or inevitable?</p>
<h2>Consequences</h2>
<p>What changed because of it? Who was affected? What does the world look like after?</p>
<div class="cb cb-secret"><div class="cb-secret-label">🔒 SECRET</div>What really happened, versus what the public knows?</div>`
      },
      {
        id: 'details',
        label: 'Details',
        hidden: true,
        content: `<div class="cb cb-info">A blow-by-blow of the event. Timeline, participants, evidence.</div>
<h2>Timeline</h2>
<p>Step by step, what happened when?</p>
<h2>Participants</h2>
<p>Who was there? What did each of them do?</p>`
      }
    ],
    properties: [
      { key: 'summary', type: 'text', label: 'Summary', placeholder: 'A one-line summary.' },
      { key: 'when', type: 'text', label: 'When', placeholder: 'e.g. Year 872, Third Age' },
      { key: 'where', type: 'refs', label: 'Where' },
      { key: 'participants', type: 'refs', label: 'Participants' },
      { key: 'tags', type: 'tags', label: 'Tags' }
    ]
  },
  note: {
    name: 'Note',
    icon: 'file-text',
    tabs: [
      {
        id: 'overview',
        label: 'Overview',
        hidden: false,
        content: `<div class="cb cb-info">A general-purpose page for anything that doesn't fit a specific template. Worldbuilding concepts, magic systems, cultural notes, scene ideas.</div>
<h2>Notes</h2>
<p>Start writing.</p>`
      }
    ],
    properties: [
      { key: 'tags', type: 'tags', label: 'Tags' }
    ]
  },
  species: {
    name: 'Species',
    icon: 'sparkles',
    tabs: [
      {
        id: 'overview',
        label: 'Overview',
        hidden: false,
        content: `<div class="cb cb-info">A sapient species, a race, a lineage, an entire people. Everything about who they are and how they live.</div>
<div class="cb cb-quote">"Something said by or about this species."</div>
<h2>At a glance</h2>
<p>The one-paragraph pitch. What are they? Where do they live? What sets them apart?</p>
<h2>Origins</h2>
<p>Where did they come from? Are they native to somewhere, or descended from something else? How long have they been around?</p>`
      },
      {
        id: 'biology',
        label: 'Biology',
        hidden: true,
        content: `<div class="cb cb-info">The physical facts. Appearance, lifespan, reproduction, biological quirks.</div>
<h2>Appearance</h2>
<p>What do they look like? Size, coloration, distinguishing traits, variation within the species.</p>
<h2>Lifespan &amp; Reproduction</h2>
<p>How long do they live? How do they mate, bond, produce offspring? Any biological requirements or taboos?</p>
<h2>Abilities &amp; Limitations</h2>
<p>What can they do that others can't? What can't they do that others can?</p>`
      },
      {
        id: 'lifestyle',
        label: 'Lifestyle',
        hidden: false,
        content: `<div class="cb cb-info">How they actually live day-to-day. Culture, food, work, social norms.</div>
<h2>Daily Life</h2>
<p>What does a typical day look like for one of them?</p>
<h2>Social Structure</h2>
<p>Family units, community structures, hierarchies. Who has power over whom?</p>
<h2>Art &amp; Craft</h2>
<p>What do they make? What do they value making?</p>`
      },
      {
        id: 'beliefs',
        label: 'Beliefs',
        hidden: false,
        content: `<div class="cb cb-info">What they think about the world and themselves. Religion, philosophy, taboos, values.</div>
<h2>Worldview</h2>
<p>How do they understand the universe? What do they believe about their place in it?</p>
<h2>Practices</h2>
<p>Rituals, ceremonies, holidays, everyday spiritual habits.</p>
<h2>Taboos</h2>
<p>What is unthinkable to them? What crosses a line?</p>`
      },
      {
        id: 'relations',
        label: 'Relations',
        hidden: false,
        content: `<div class="cb cb-info">How they relate to other peoples, species, and factions. Allies, enemies, complicated histories.</div>
<h2>Allies &amp; Trade Partners</h2>
<p>Who do they get along with? What's the basis of the relationship?</p>
<h2>Rivals &amp; Enemies</h2>
<p>Who do they clash with? Old grievances, active conflicts?</p>
<h2>Reputation</h2>
<p>What do outsiders think of them? Is the reputation deserved?</p>`
      }
    ],
    properties: [
      { key: 'summary', type: 'text', label: 'Summary', placeholder: 'A one-line summary.' },
      { key: 'homeland', type: 'refs', label: 'Homeland' },
      { key: 'tags', type: 'tags', label: 'Tags' }
    ]
  }
};

const ICON_MAP = {
  'folder': FolderIcon,
  'user': User,
  'map-pin': MapPin,
  'users': Users,
  'package': Package,
  'calendar': Calendar,
  'file-text': FileText,
  'sparkles': Sparkles
};

// Curated palette — tuned to look right on the dark theme
const COLOR_PALETTE = [
  { key: 'default', name: 'Default', hex: null },
  { key: 'teal',    name: 'Teal',    hex: '#5eead4' },
  { key: 'sky',     name: 'Sky',     hex: '#7dd3fc' },
  { key: 'purple',  name: 'Purple',  hex: '#c4b5fd' },
  { key: 'rose',    name: 'Rose',    hex: '#fda4af' },
  { key: 'amber',   name: 'Amber',   hex: '#fcd34d' },
  { key: 'sage',    name: 'Sage',    hex: '#86efac' },
  { key: 'orange',  name: 'Orange',  hex: '#fdba74' },
  { key: 'indigo',  name: 'Indigo',  hex: '#a5b4fc' },
  { key: 'red',     name: 'Red',     hex: '#fca5a5' },
  { key: 'gray',    name: 'Gray',    hex: '#a1a1aa' }
];

const getColorHex = (key) => COLOR_PALETTE.find(c => c.key === key)?.hex || null;

// ============================================================
// DEFAULT DATA — a starter tree so it's not empty
// ============================================================

const uid = () => Math.random().toString(36).slice(2, 10);

const makeNode = (templateKey, name, parentId = null) => {
  const template = TEMPLATES[templateKey];
  const id = uid();
  return {
    id,
    parentId,
    templateKey,
    name,
    tabs: template.tabs.map(t => ({ ...t })),
    properties: {},
    tags: [],
    createdAt: Date.now()
  };
};

const buildDefaultProject = () => {
  const canon = makeNode('folder', 'Canon');
  canon.color = 'sky';
  const aus = makeNode('folder', 'AUs');
  aus.color = 'purple';
  const chars = makeNode('folder', 'Characters');
  chars.color = 'rose';
  const locs = makeNode('folder', 'Locations');
  locs.color = 'sage';
  const factions = makeNode('folder', 'Factions');
  factions.color = 'amber';
  const world = makeNode('folder', 'Worldbuilding');
  world.color = 'teal';

  const exampleChar = makeNode('character', 'Example Character');
  exampleChar.parentId = chars.id;

  const exampleLoc = makeNode('location', 'Example Location');
  exampleLoc.parentId = locs.id;

  const exampleFaction = makeNode('faction', 'Example Faction');
  exampleFaction.parentId = factions.id;

  const exampleItem = makeNode('item', 'Example Item');
  exampleItem.parentId = world.id;

  const exampleEvent = makeNode('event', 'Example Event');
  exampleEvent.parentId = world.id;

  const exampleNote = makeNode('note', 'Example Note');
  exampleNote.parentId = world.id;

  return {
    projectName: 'My World',
    nodes: {
      [canon.id]: canon,
      [aus.id]: aus,
      [chars.id]: chars,
      [locs.id]: locs,
      [factions.id]: factions,
      [world.id]: world,
      [exampleChar.id]: exampleChar,
      [exampleLoc.id]: exampleLoc,
      [exampleFaction.id]: exampleFaction,
      [exampleItem.id]: exampleItem,
      [exampleEvent.id]: exampleEvent,
      [exampleNote.id]: exampleNote
    },
    rootOrder: [canon.id, aus.id, chars.id, locs.id, factions.id, world.id],
    expandedIds: [chars.id, locs.id, factions.id, world.id],
    selectedId: exampleChar.id
  };
};

// ============================================================
// STORAGE
// ============================================================

const STORAGE_KEY = 'anamnesis:project:v1';

async function loadProject() {
  try {
    const result = await window.storage.get(STORAGE_KEY);
    if (result && result.value) {
      return JSON.parse(result.value);
    }
  } catch (e) {
    // no saved state, use default
  }
  return buildDefaultProject();
}

async function saveProject(project) {
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(project));
  } catch (e) {
    console.error('save failed', e);
  }
}

// ============================================================
// COMPONENTS
// ============================================================

function TreeItem({ node, nodes, expandedIds, selectedId, onToggle, onSelect, onAddChild, onSetColor, colorPickerFor, setColorPickerFor, inheritedColor = null, depth = 0 }) {
  const template = TEMPLATES[node.templateKey];
  const Icon = ICON_MAP[template.icon] || FileText;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const children = Object.values(nodes).filter(n => n.parentId === node.id);
  const hasChildren = children.length > 0;
  const canHaveChildren = template.isFolder || node.templateKey === 'location' || node.templateKey === 'character' || node.templateKey === 'faction' || node.templateKey === 'species';

  const ownColor = getColorHex(node.color);
  const effectiveColor = ownColor || inheritedColor;
  const ownsColor = !!ownColor;
  const isFolder = template.isFolder;
  const showFolderColor = isFolder && effectiveColor;

  const iconStyle = effectiveColor ? { color: effectiveColor } : undefined;
  const iconClassName = `flex-shrink-0 ${!effectiveColor && (isSelected ? 'text-teal-300' : 'text-neutral-400')}`;
  const nameStyle = showFolderColor ? { color: effectiveColor, fontWeight: 500 } : undefined;

  // Row background: folders with color get a full row tint; uncolored rows use the teal selection style
  const rowStyle = {
    paddingLeft: `${depth * 12 + 8}px`,
    borderLeft: ownsColor ? `2px solid ${ownColor}` : '2px solid transparent'
  };
  if (showFolderColor) {
    rowStyle.backgroundColor = isSelected ? `${effectiveColor}40` : `${effectiveColor}1f`;
  }

  const rowClassName = `group relative flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-sm transition-colors ${
    showFolderColor
      ? '' // colored folder — bg comes from inline style
      : isSelected
        ? 'bg-teal-500/20 text-teal-100'
        : 'hover:bg-neutral-800 text-neutral-300'
  }`;

  return (
    <div>
      <div
        className={rowClassName}
        style={rowStyle}
        onClick={() => onSelect(node.id)}
      >
        <button
          className="w-4 h-4 flex items-center justify-center flex-shrink-0"
          onClick={(e) => { e.stopPropagation(); if (hasChildren || canHaveChildren) onToggle(node.id); }}
        >
          {(hasChildren || (canHaveChildren && isExpanded)) && (
            isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          )}
        </button>
        <Icon size={14} className={iconClassName} style={iconStyle} />
        <span className="truncate flex-1" style={nameStyle}>{node.name}</span>
        <button
          className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded-full flex-shrink-0 border transition-opacity"
          style={ownColor
            ? { backgroundColor: ownColor, borderColor: ownColor }
            : { borderColor: '#525252', backgroundColor: 'transparent' }
          }
          onClick={(e) => {
            e.stopPropagation();
            setColorPickerFor(colorPickerFor === node.id ? null : node.id);
          }}
          title="Set color"
        />
        {canHaveChildren && (
          <button
            className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-neutral-700 flex-shrink-0"
            onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
            title="Add child"
          >
            <Plus size={12} />
          </button>
        )}

        {colorPickerFor === node.id && (
          <div
            className="absolute z-30 top-full right-2 mt-1 bg-neutral-900 border border-neutral-700 rounded-lg p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {inheritedColor && !ownColor && (
              <div className="text-[10px] text-neutral-500 mb-1.5 px-1">Inheriting from parent</div>
            )}
            <div className="grid grid-cols-6 gap-1">
              {COLOR_PALETTE.map(c => (
                <button
                  key={c.key}
                  onClick={() => { onSetColor(node.id, c.key); setColorPickerFor(null); }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${
                    node.color === c.key ? 'border-white' : 'border-neutral-700'
                  }`}
                  style={{ backgroundColor: c.hex || 'transparent' }}
                  title={c.name}
                >
                  {!c.hex && <X size={12} className="text-neutral-500" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {isExpanded && children.map(child => (
        <TreeItem
          key={child.id}
          node={child}
          nodes={nodes}
          expandedIds={expandedIds}
          selectedId={selectedId}
          onToggle={onToggle}
          onSelect={onSelect}
          onAddChild={onAddChild}
          onSetColor={onSetColor}
          colorPickerFor={colorPickerFor}
          setColorPickerFor={setColorPickerFor}
          inheritedColor={effectiveColor}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

function NewPageMenu({ onCreate, onClose, parentName }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-5 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-neutral-400">New page in <span className="text-neutral-200">{parentName}</span></div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(TEMPLATES).map(([key, tpl]) => {
            const Icon = ICON_MAP[tpl.icon];
            return (
              <button
                key={key}
                onClick={() => onCreate(key)}
                className="flex flex-col items-center gap-2 p-3 rounded border border-neutral-700 hover:border-teal-500/50 hover:bg-neutral-800 transition-colors text-neutral-300 hover:text-teal-100"
              >
                <Icon size={20} />
                <span className="text-xs">{tpl.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EditableContent({ html, onChange }) {
  const ref = useRef(null);
  const initialHtml = useRef(html);
  const lastSavedHtml = useRef(html);

  // Only reset innerHTML when the incoming html is genuinely different
  // from what we last saved (i.e., we switched pages/tabs)
  useEffect(() => {
    if (ref.current && html !== lastSavedHtml.current) {
      ref.current.innerHTML = html;
      lastSavedHtml.current = html;
      initialHtml.current = html;
    }
  }, [html]);

  const handleBlur = () => {
    if (ref.current) {
      const newHtml = ref.current.innerHTML;
      lastSavedHtml.current = newHtml;
      onChange(newHtml);
    }
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      className="wiki-body focus:outline-none"
      dangerouslySetInnerHTML={{ __html: initialHtml.current }}
    />
  );
}

function PageView({ node, activeTab, onTabChange, onContentChange, onRename, onToggleHidden }) {
  const template = TEMPLATES[node.templateKey];
  const Icon = ICON_MAP[template.icon];
  const tab = node.tabs.find(t => t.id === activeTab) || node.tabs[0];
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(node.name);

  useEffect(() => { setTitleDraft(node.name); }, [node.name]);

  if (template.isFolder) {
    return (
      <div className="p-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <FolderIcon size={24} className="text-neutral-400" />
          {titleEditing ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => { onRename(titleDraft); setTitleEditing(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
              className="text-3xl font-semibold bg-transparent border-b border-teal-500 outline-none text-neutral-100"
            />
          ) : (
            <h1
              className="text-3xl font-semibold text-neutral-100 cursor-text"
              onClick={() => setTitleEditing(true)}
            >
              {node.name}
            </h1>
          )}
        </div>
        <p className="text-neutral-500 text-sm">Folders hold other pages. Click the + on the folder in the tree to add a child page.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8 max-w-3xl">
        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <Icon size={24} className="text-neutral-400" />
          {titleEditing ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => { onRename(titleDraft); setTitleEditing(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
              className="text-3xl font-semibold bg-transparent border-b border-teal-500 outline-none text-neutral-100 flex-1"
            />
          ) : (
            <h1
              className="text-3xl font-semibold text-neutral-100 cursor-text flex-1"
              onClick={() => setTitleEditing(true)}
            >
              {node.name}
            </h1>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-neutral-800 mb-6">
          {node.tabs.map(t => {
            const isActive = t.id === activeTab;
            return (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={`group flex items-center gap-1.5 px-3 py-2 text-sm transition-colors relative ${
                  isActive ? 'text-neutral-100' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <FileText size={12} />
                <span>{t.label}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleHidden(t.id); }}
                  className="opacity-60 hover:opacity-100"
                  title={t.hidden ? 'Hidden — click to reveal' : 'Visible — click to hide'}
                >
                  {t.hidden ? <EyeOff size={12} /> : null}
                </button>
                {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400" />}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <EditableContent
          key={`${node.id}-${tab.id}`}
          html={tab.content}
          onChange={(html) => onContentChange(tab.id, html)}
        />
      </div>
    </div>
  );
}

function PropertiesPanel({ node, allNodes, onPropertyChange }) {
  const template = TEMPLATES[node.templateKey];
  if (template.isFolder) return null;

  return (
    <div className="w-72 bg-neutral-950/60 border-l border-neutral-800 p-5 overflow-y-auto flex-shrink-0">
      {/* Image slot */}
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Image</div>
        <div className="aspect-square bg-neutral-900 border border-dashed border-neutral-700 rounded flex items-center justify-center text-neutral-600">
          <div className="text-center">
            <ImageIcon size={24} className="mx-auto mb-1 opacity-50" />
            <div className="text-xs">Drop image here</div>
          </div>
        </div>
      </div>

      {/* Template properties */}
      {template.properties.map(prop => {
        const value = node.properties[prop.key] || (prop.type === 'tags' || prop.type === 'refs' ? [] : '');

        if (prop.type === 'text') {
          return (
            <div key={prop.key} className="mb-4">
              <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1.5">{prop.label}</div>
              <textarea
                value={value}
                onChange={(e) => onPropertyChange(prop.key, e.target.value)}
                placeholder={prop.placeholder}
                rows={3}
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-teal-500/50 resize-none"
              />
            </div>
          );
        }

        if (prop.type === 'tags') {
          const tags = Array.isArray(value) ? value : [];
          return (
            <div key={prop.key} className="mb-4">
              <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1.5">{prop.label}</div>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {tags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-neutral-800 text-neutral-300 rounded px-2 py-0.5">
                    {tag}
                    <button onClick={() => onPropertyChange(prop.key, tags.filter((_, idx) => idx !== i))} className="hover:text-red-400">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add tag + enter"
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-teal-500/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    onPropertyChange(prop.key, [...tags, e.target.value.trim()]);
                    e.target.value = '';
                  }
                }}
              />
            </div>
          );
        }

        if (prop.type === 'refs') {
          const refs = Array.isArray(value) ? value : [];
          const referenceableNodes = Object.values(allNodes).filter(n => !TEMPLATES[n.templateKey].isFolder && n.id !== node.id);
          return (
            <div key={prop.key} className="mb-4">
              <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1.5">{prop.label}</div>
              <div className="flex flex-col gap-1 mb-1.5">
                {refs.map((refId, i) => {
                  const refNode = allNodes[refId];
                  if (!refNode) return null;
                  const RefIcon = ICON_MAP[TEMPLATES[refNode.templateKey].icon];
                  return (
                    <div key={i} className="flex items-center gap-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-neutral-300">
                      <RefIcon size={12} className="text-neutral-500" />
                      <span className="flex-1">{refNode.name}</span>
                      <button onClick={() => onPropertyChange(prop.key, refs.filter((_, idx) => idx !== i))} className="hover:text-red-400">
                        <X size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    onPropertyChange(prop.key, [...refs, e.target.value]);
                    e.target.value = '';
                  }
                }}
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-400 focus:outline-none focus:border-teal-500/50"
              >
                <option value="">+ Add reference…</option>
                {referenceableNodes.filter(n => !refs.includes(n.id)).map(n => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

// ============================================================
// APP
// ============================================================

export default function App() {
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [newPageParent, setNewPageParent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [colorPickerFor, setColorPickerFor] = useState(null);

  // Close color picker on outside click
  useEffect(() => {
    if (!colorPickerFor) return;
    const handler = () => setColorPickerFor(null);
    // Delay so the same click that opens it doesn't immediately close it
    const t = setTimeout(() => window.addEventListener('click', handler), 0);
    return () => { clearTimeout(t); window.removeEventListener('click', handler); };
  }, [colorPickerFor]);

  // Load once on mount
  useEffect(() => {
    loadProject().then(setProject);
  }, []);

  // Save on any change (debounced)
  useEffect(() => {
    if (!project) return;
    const t = setTimeout(() => saveProject(project), 300);
    return () => clearTimeout(t);
  }, [project]);

  if (!project) {
    return <div className="h-screen bg-neutral-950 flex items-center justify-center text-neutral-500">Loading…</div>;
  }

  const expandedIds = new Set(project.expandedIds);
  const selectedNode = project.nodes[project.selectedId];

  const toggleExpanded = (id) => {
    setProject(p => ({
      ...p,
      expandedIds: expandedIds.has(id)
        ? p.expandedIds.filter(x => x !== id)
        : [...p.expandedIds, id]
    }));
  };

  const selectNode = (id) => {
    setProject(p => ({ ...p, selectedId: id }));
    const n = project.nodes[id];
    if (n && n.tabs.length > 0) {
      setActiveTab(n.tabs[0].id);
    }
  };

  const createChild = (parentId, templateKey) => {
    const newNode = makeNode(templateKey, `New ${TEMPLATES[templateKey].name}`, parentId);
    setProject(p => ({
      ...p,
      nodes: { ...p.nodes, [newNode.id]: newNode },
      expandedIds: p.expandedIds.includes(parentId) ? p.expandedIds : [...p.expandedIds, parentId],
      selectedId: newNode.id
    }));
    setActiveTab(TEMPLATES[templateKey].tabs[0]?.id || 'overview');
    setNewPageParent(null);
  };

  const updateContent = (tabId, html) => {
    setProject(p => ({
      ...p,
      nodes: {
        ...p.nodes,
        [selectedNode.id]: {
          ...selectedNode,
          tabs: selectedNode.tabs.map(t => t.id === tabId ? { ...t, content: html } : t)
        }
      }
    }));
  };

  const renameNode = (newName) => {
    if (!newName.trim()) return;
    setProject(p => ({
      ...p,
      nodes: { ...p.nodes, [selectedNode.id]: { ...selectedNode, name: newName.trim() } }
    }));
  };

  const toggleTabHidden = (tabId) => {
    setProject(p => ({
      ...p,
      nodes: {
        ...p.nodes,
        [selectedNode.id]: {
          ...selectedNode,
          tabs: selectedNode.tabs.map(t => t.id === tabId ? { ...t, hidden: !t.hidden } : t)
        }
      }
    }));
  };

  const updateProperty = (key, value) => {
    setProject(p => ({
      ...p,
      nodes: {
        ...p.nodes,
        [selectedNode.id]: {
          ...selectedNode,
          properties: { ...selectedNode.properties, [key]: value }
        }
      }
    }));
  };

  const setNodeColor = (nodeId, colorKey) => {
    setProject(p => ({
      ...p,
      nodes: {
        ...p.nodes,
        [nodeId]: { ...p.nodes[nodeId], color: colorKey }
      }
    }));
  };

  const rootNodes = project.rootOrder.map(id => project.nodes[id]).filter(Boolean);

  const filteredCheck = (node) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return node.name.toLowerCase().includes(q) ||
      (node.tags || []).some(t => t.toLowerCase().includes(q));
  };

  return (
    <>
      <style>{`
        body { margin: 0; }
        .wiki-body { color: #d4d4d8; font-size: 15px; line-height: 1.65; }
        .wiki-body h2 { color: #f4f4f5; font-size: 1.35rem; font-weight: 600; margin: 1.4rem 0 0.6rem; letter-spacing: -0.01em; }
        .wiki-body h3 { color: #e4e4e7; font-size: 1.1rem; font-weight: 600; margin: 1.1rem 0 0.4rem; }
        .wiki-body p { margin: 0.5rem 0; }
        .wiki-body em { color: #a1a1aa; font-style: italic; }
        .wiki-body strong { color: #f4f4f5; font-weight: 600; }
        .cb { border-radius: 6px; padding: 0.75rem 1rem; margin: 0.85rem 0; font-size: 0.925rem; }
        .cb-info { background: rgba(59, 130, 246, 0.12); border-left: 3px solid #60a5fa; color: #dbeafe; }
        .cb-quote { background: rgba(255,255,255,0.03); border-left: 3px solid #52525b; color: #d4d4d8; font-style: italic; }
        .cb-secret { background: rgba(167, 139, 250, 0.12); border: 1px solid rgba(167, 139, 250, 0.3); color: #ede9fe; }
        .cb-secret-label { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; color: #c4b5fd; margin-bottom: 0.4rem; }
      `}</style>
      <div className="h-screen flex bg-neutral-950 text-neutral-100 font-sans">
        {/* Left panel */}
        <div className="w-72 bg-neutral-950 border-r border-neutral-800 flex flex-col flex-shrink-0">
          {/* Top tabs */}
          <div className="flex items-center gap-4 px-3 pt-3 pb-2 text-xs text-neutral-500 border-b border-neutral-800">
            <button className="text-neutral-100 border-b-2 border-teal-400 pb-1.5 -mb-[9px] px-0.5">Project</button>
            <button className="hover:text-neutral-300">Templates</button>
            <button className="hover:text-neutral-300">Assets</button>
          </div>

          {/* Search */}
          <div className="p-2 border-b border-neutral-800">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find by name or #tag"
                className="w-full bg-neutral-900 border border-neutral-800 rounded pl-7 pr-2 py-1.5 text-xs text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-teal-500/50"
              />
            </div>
          </div>

          {/* Tree */}
          <div className="flex-1 overflow-y-auto p-1">
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-200">
                <Home size={12} />
                <span>{project.projectName}</span>
              </div>
              <button
                onClick={() => setNewPageParent('__root__')}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-neutral-800 text-neutral-400"
                title="Add top-level page"
              >
                <Plus size={12} />
              </button>
            </div>
            {rootNodes.map(node => (
              <TreeItem
                key={node.id}
                node={node}
                nodes={project.nodes}
                expandedIds={expandedIds}
                selectedId={project.selectedId}
                onToggle={toggleExpanded}
                onSelect={selectNode}
                onAddChild={(pid) => setNewPageParent(pid)}
                onSetColor={setNodeColor}
                colorPickerFor={colorPickerFor}
                setColorPickerFor={setColorPickerFor}
              />
            ))}
          </div>
        </div>

        {/* Center + right */}
        <div className="flex-1 flex overflow-hidden">
          {selectedNode ? (
            <>
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Breadcrumb bar */}
                <div className="h-10 px-6 flex items-center justify-between border-b border-neutral-800 text-xs text-neutral-500 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span>{project.projectName}</span>
                    <ChevronRight size={10} />
                    <span className="text-neutral-300">{selectedNode.name}</span>
                  </div>
                  <button
                    onClick={() => setShowRightPanel(!showRightPanel)}
                    className="text-neutral-500 hover:text-neutral-200"
                    title="Toggle properties panel"
                  >
                    <PanelRight size={14} />
                  </button>
                </div>
                <PageView
                  key={selectedNode.id}
                  node={selectedNode}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  onContentChange={updateContent}
                  onRename={renameNode}
                  onToggleHidden={toggleTabHidden}
                />
              </div>
              {showRightPanel && (
                <PropertiesPanel
                  node={selectedNode}
                  allNodes={project.nodes}
                  onPropertyChange={updateProperty}
                />
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-500">
              Select a page to begin.
            </div>
          )}
        </div>

        {/* New page modal */}
        {newPageParent && (
          <NewPageMenu
            onCreate={(templateKey) => createChild(newPageParent === '__root__' ? null : newPageParent, templateKey)}
            onClose={() => setNewPageParent(null)}
            parentName={newPageParent === '__root__' ? project.projectName : (project.nodes[newPageParent]?.name || 'root')}
          />
        )}
      </div>
    </>
  );
}
