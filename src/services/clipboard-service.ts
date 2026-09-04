// Putting text on the clipboard, with the old way behind the new one.
//
// **Two routes because the modern one has a condition.** `navigator.clipboard`
// needs the document focused and the call to be inside a real user gesture; a
// click on a button inside the editor can lose that focus to whatever the
// editor does with the selection first. `execCommand("copy")` has neither
// requirement and is what every app fell back to before. Lifted out of
// code-block.ts, which had this shape written into it and now shares it, so
// there is one answer to "did the copy work" rather than two.
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const scratch = document.createElement("textarea");
    scratch.value = text;
    scratch.setAttribute("aria-hidden", "true");
    scratch.style.cssText = "position:fixed;top:-1000px;opacity:0";
    document.body.append(scratch);
    scratch.select();
    const ok = document.execCommand("copy");
    scratch.remove();
    return ok;
  }
}
