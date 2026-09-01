// The inline icon itself: a small picture in a line of writing that opens its
// picker when you click it. Phase 19.5.
//
// **Clickable afterwards is the whole feature.** BlockNote already has an
// emoji command, and what it inserts is a character — indistinguishable from
// any other letter the moment it lands, changeable only by deleting it. This
// stays an icon: it knows what it is, so it can be asked again.
//
// Split out of the spec beside it for the reason `MentionChip` is split out of
// `mention-inline-content.tsx`: a file that exports both a BlockNote spec and a
// React component loses fast refresh for the component.
import { useContext, useRef, useState } from "react";
import { IconPickContext } from "./icon-pick-context";
import { StoredIcon } from "./stored-icon";

type IconChipProps = {
  icon: string;
  onPick: (icon: string) => void;
};

export function IconChip({ icon, onPick }: IconChipProps) {
  const Picker = useContext(IconPickContext);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const button = useRef<HTMLSpanElement>(null);

  // **A span rather than a button, and `contentEditable={false}` on it.**
  // ProseMirror owns this DOM: a real button inside the writing takes the caret
  // when it is clicked and puts a focus ring in the middle of a sentence, and
  // an editable node here would let a keystroke land inside the icon.
  return (
    <span className="editor-inline-icon-wrap" contentEditable={false}>
      <span
        ref={button}
        className="editor-inline-icon"
        role="button"
        tabIndex={-1}
        aria-label="Change this icon"
        title="Change this icon"
        // Keeps the caret where she was writing — the same reason the callout's
        // colour dot does it.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (!Picker) return;
          setRect(button.current?.getBoundingClientRect() ?? null);
        }}
      >
        <StoredIcon icon={icon} size={16} />
      </span>
      {Picker && rect && (
        // eslint-disable-next-line react-hooks/static-components -- the value is a module-level component (EditorIconPicker), which is the invariant IconPickerRenderer states; the rule cannot see across a context
        <Picker
          anchorRect={rect}
          value={icon}
          onPick={(picked) => {
            // **"No icon" is not one of the answers here.** An inline icon with
            // no icon is an invisible thing sitting in a sentence with a
            // caret-width of nothing to grab; taking it out is what Backspace
            // is for. So a cleared pick just closes the picker.
            if (picked) onPick(picked);
            setRect(null);
          }}
          onClose={() => setRect(null)}
        />
      )}
    </span>
  );
}
