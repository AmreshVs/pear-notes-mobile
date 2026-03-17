export function getEditorHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
  />
  <style>
    :root {
      --c-text:            #000000;
      --c-text-secondary:  #48484a;
      --c-bg:              #f2f2f7;
      --c-surface:         #ffffff;
      --c-primary:         #DCA323;
      --c-border:          #c6c6c8;
      --c-placeholder:     rgba(0,0,0,0.28);
      --c-code-bg:         #F0F0F2;
      --c-code:            #2D5016;
      --c-codeblock-bg:    #F4F4F5;
      --hl-keyword:  #D73A49;
      --hl-string:   #032F62;
      --hl-comment:  #6A737D;
      --hl-number:   #005CC5;
      --hl-fn:       #6F42C1;
      --hl-var:      #E36209;
      --hl-builtin:  #005CC5;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --c-text:           #ffffff;
        --c-text-secondary: #b0b0b5;
        --c-bg:             #202020;
        --c-surface:        #1c1c1e;
        --c-primary:        #DCA323;
        --c-border:         #38383a;
        --c-placeholder:    rgba(255,255,255,0.28);
        --c-code-bg:        #1C1C1E;
        --c-code:           #A8FF78;
        --c-codeblock-bg:   #141414;
        --hl-keyword:  #FF79C6;
        --hl-string:   #F1FA8C;
        --hl-comment:  #6272A4;
        --hl-number:   #BD93F9;
        --hl-fn:       #50FA7B;
        --hl-var:      #FFB86C;
        --hl-builtin:  #8BE9FD;
      }
    }

    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      background: var(--c-bg);
      height: 100%;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    #editor {
      min-height: 100vh;
      contain: layout style;
    }

    .tiptap {
      min-height: 100vh;
      padding: 8px 20px 180px 20px;
      outline: none;
      color: var(--c-text);
      font-size: 17px;
      font-family: -apple-system, BlinkMacSystemFont, 'San Francisco',
                   'Helvetica Neue', Arial, sans-serif;
      line-height: 1.65;
      word-wrap: break-word;
      caret-color: var(--c-primary);
      contain: style;
      will-change: contents;
    }

    .tiptap p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: var(--c-placeholder);
      pointer-events: none;
      height: 0;
    }

    .tiptap h1 { font-size: 26px; font-weight: 700; margin: 20px 0 8px; line-height: 1.3; }
    .tiptap h2 { font-size: 22px; font-weight: 600; margin: 16px 0 6px; line-height: 1.3; }
    .tiptap h3 { font-size: 19px; font-weight: 600; margin: 12px 0 4px; line-height: 1.3; }
    .tiptap :is(h1,h2,h3):first-child { margin-top: 0; }

    .tiptap p { margin: 0 0 6px; }
    .tiptap p:last-child { margin-bottom: 0; }

    .tiptap ul, .tiptap ol { padding-left: 22px; margin: 4px 0 8px; }
    .tiptap li { margin: 3px 0; }
    .tiptap li p { margin: 0; }
    .tiptap ul { list-style-type: disc; }
    .tiptap ul li::marker { color: var(--c-primary); }
    .tiptap ol li::marker { color: var(--c-primary); }

    .tiptap ul[data-type="taskList"] { list-style: none; padding-left: 2px; }
    .tiptap ul[data-type="taskList"] li {
      display: flex; align-items: flex-start; gap: 10px; margin: 5px 0;
    }
    .tiptap ul[data-type="taskList"] li > label { flex-shrink: 0; margin-top: 3px; }
    .tiptap ul[data-type="taskList"] li > label input[type="checkbox"] {
      width: 18px; height: 18px; cursor: pointer;
      accent-color: var(--c-primary); border-radius: 4px;
    }
    .tiptap ul[data-type="taskList"] li[data-checked="true"] > div {
      opacity: 0.55; text-decoration: line-through;
    }
    .tiptap ul[data-type="taskList"] li > div { flex: 1; }

    .tiptap blockquote {
      border-left: 3px solid var(--c-primary);
      padding-left: 16px; margin: 8px 0;
      color: var(--c-text-secondary);
    }

    .tiptap code {
      background: var(--c-code-bg); color: var(--c-code);
      padding: 2px 6px; border-radius: 4px; font-size: 0.88em;
      font-family: 'SF Mono', SFMono-Regular, ui-monospace, 'Courier New', monospace;
    }

    .tiptap pre {
      background: var(--c-codeblock-bg);
      padding: 16px; border-radius: 10px; margin: 8px 0; overflow-x: auto;
    }
    .tiptap pre code {
      background: none; color: var(--c-code); padding: 0;
      border-radius: 0; font-size: 13px;
      font-family: 'SF Mono', SFMono-Regular, ui-monospace, 'Courier New', monospace;
    }

    .hljs-keyword, .hljs-selector-tag, .hljs-built_in { color: var(--hl-keyword); }
    .hljs-string, .hljs-attr, .hljs-template-variable  { color: var(--hl-string);  }
    .hljs-comment, .hljs-quote                          { color: var(--hl-comment); font-style: italic; }
    .hljs-number, .hljs-literal, .hljs-regexp           { color: var(--hl-number);  }
    .hljs-title, .hljs-section                          { color: var(--hl-fn);      font-weight: 600; }
    .hljs-variable, .hljs-name, .hljs-tag               { color: var(--hl-var);     }
    .hljs-type, .hljs-class .hljs-title                 { color: var(--hl-builtin); }

    .tiptap a { color: var(--c-primary); text-decoration: underline; }

    .tiptap mark { border-radius: 3px; padding: 1px 2px; }

    .tiptap img {
      max-width: 100%; height: auto;
      border-radius: 8px; display: block; margin: 8px 0;
    }

    .tiptap table {
      border-collapse: collapse; width: 100%;
      margin: 8px 0; font-size: 15px;
    }
    .tiptap table td, .tiptap table th {
      border: 1px solid var(--c-border);
      padding: 8px 12px; min-width: 80px; vertical-align: top;
    }
    .tiptap table th {
      background: var(--c-surface); font-weight: 600; text-align: left;
    }
    .tiptap td, .tiptap th { position: relative; }
    .tiptap .selectedCell::after {
      background: color-mix(in srgb, var(--c-primary) 20%, transparent);
      content: ''; position: absolute; inset: 0; pointer-events: none;
    }

    .tiptap hr { border: none; border-top: 1px solid var(--c-border); margin: 16px 0; }
    .tiptap sub  { vertical-align: sub;   font-size: 0.8em; }
    .tiptap sup  { vertical-align: super; font-size: 0.8em; }
    ::selection  { background: color-mix(in srgb, var(--c-primary) 30%, transparent); }
  </style>
</head>
<body>
  <div id="editor"></div>

  <script type="module">
    import { Editor }            from 'https://esm.sh/@tiptap/core@3';
    import StarterKit            from 'https://esm.sh/@tiptap/starter-kit@3';
    import Placeholder           from 'https://esm.sh/@tiptap/extension-placeholder@3';
    import Underline             from 'https://esm.sh/@tiptap/extension-underline@3';
    import Strike                from 'https://esm.sh/@tiptap/extension-strike@3';
    import TaskList              from 'https://esm.sh/@tiptap/extension-task-list@3';
    import TaskItem              from 'https://esm.sh/@tiptap/extension-task-item@3';
    import TextAlign             from 'https://esm.sh/@tiptap/extension-text-align@3';
    import Link                  from 'https://esm.sh/@tiptap/extension-link@3';
    import Highlight             from 'https://esm.sh/@tiptap/extension-highlight@3';
    import Subscript             from 'https://esm.sh/@tiptap/extension-subscript@3';
    import Superscript           from 'https://esm.sh/@tiptap/extension-superscript@3';
    import Image                 from 'https://esm.sh/@tiptap/extension-image@3';
    import { Table }             from 'https://esm.sh/@tiptap/extension-table@3';
    import { TableRow }          from 'https://esm.sh/@tiptap/extension-table-row@3';
    import { TableCell }         from 'https://esm.sh/@tiptap/extension-table-cell@3';
    import { TableHeader }       from 'https://esm.sh/@tiptap/extension-table-header@3';
    import { CodeBlockLowlight } from 'https://esm.sh/@tiptap/extension-code-block-lowlight@3';
    import { createLowlight }    from 'https://esm.sh/lowlight@3';
    import langJS   from 'https://esm.sh/highlight.js@11/lib/languages/javascript';
    import langTS   from 'https://esm.sh/highlight.js@11/lib/languages/typescript';
    import langPy   from 'https://esm.sh/highlight.js@11/lib/languages/python';
    import langCSS  from 'https://esm.sh/highlight.js@11/lib/languages/css';
    import langXML  from 'https://esm.sh/highlight.js@11/lib/languages/xml';
    import langBash from 'https://esm.sh/highlight.js@11/lib/languages/bash';
    import langJSON from 'https://esm.sh/highlight.js@11/lib/languages/json';

    function sendToRN(msg) {
      try {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(msg));
        }
      } catch (_) {}
    }

    function applyTheme(colors, isDark) {
      const r = document.documentElement.style;
      r.setProperty('--c-text',           colors.text);
      r.setProperty('--c-text-secondary',  colors.textSecondary);
      r.setProperty('--c-bg',              colors.background);
      r.setProperty('--c-surface',         colors.surface);
      r.setProperty('--c-primary',         colors.primary);
      r.setProperty('--c-border',          colors.border);
      document.body.style.background = colors.background;

      r.setProperty('--c-placeholder',    isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)');
      r.setProperty('--c-code-bg',        isDark ? '#1C1C1E'  : '#F0F0F2');
      r.setProperty('--c-code',           isDark ? '#A8FF78'  : '#2D5016');
      r.setProperty('--c-codeblock-bg',   isDark ? '#141414'  : '#F4F4F5');
      r.setProperty('--hl-keyword',  isDark ? '#FF79C6' : '#D73A49');
      r.setProperty('--hl-string',   isDark ? '#F1FA8C' : '#032F62');
      r.setProperty('--hl-comment',  isDark ? '#6272A4' : '#6A737D');
      r.setProperty('--hl-number',   isDark ? '#BD93F9' : '#005CC5');
      r.setProperty('--hl-fn',       isDark ? '#50FA7B' : '#6F42C1');
      r.setProperty('--hl-var',      isDark ? '#FFB86C' : '#E36209');
      r.setProperty('--hl-builtin',  isDark ? '#8BE9FD' : '#005CC5');
    }

    const lowlight = createLowlight();
    lowlight.register('javascript', langJS);  lowlight.register('js',   langJS);
    lowlight.register('typescript', langTS);  lowlight.register('ts',   langTS);
    lowlight.register('python',     langPy);  lowlight.register('py',   langPy);
    lowlight.register('css',        langCSS);
    lowlight.register('html',       langXML); lowlight.register('xml',  langXML);
    lowlight.register('bash',       langBash); lowlight.register('sh',  langBash);
    lowlight.register('json',       langJSON);

    const ImageWithSize = Image.extend({
      addAttributes() {
        return { ...this.parent?.(), width: { default: null }, height: { default: null } };
      },
    }).configure({ inline: false, allowBase64: true });

    let contentTimer = null;
    function scheduleContentChange(html, text) {
      clearTimeout(contentTimer);
      contentTimer = setTimeout(() => sendToRN({ type: 'contentChange', html, text }), 500);
    }
    function flushContentChange(html, text) {
      clearTimeout(contentTimer);
      sendToRN({ type: 'contentChange', html, text });
    }

    let styleTimer = null;
    let lastStyleJSON = '';
    function broadcastStyleState(ed) {
      if (styleTimer) return;
      styleTimer = requestAnimationFrame(() => {
        styleTimer = null;
        const state = {
          bold:          { isActive: ed.isActive('bold') },
          italic:        { isActive: ed.isActive('italic') },
          underline:     { isActive: ed.isActive('underline') },
          strike:        { isActive: ed.isActive('strike') },
          h1:            { isActive: ed.isActive('heading', { level: 1 }) },
          h2:            { isActive: ed.isActive('heading', { level: 2 }) },
          h3:            { isActive: ed.isActive('heading', { level: 3 }) },
          unorderedList: { isActive: ed.isActive('bulletList') },
          orderedList:   { isActive: ed.isActive('orderedList') },
          checkboxList:  { isActive: ed.isActive('taskList') },
          blockQuote:    { isActive: ed.isActive('blockquote') },
          codeBlock:     { isActive: ed.isActive('codeBlock') },
          link:          { isActive: ed.isActive('link') },
          highlight:     { isActive: ed.isActive('highlight') },
        };
        const json = JSON.stringify(state);
        if (json === lastStyleJSON) return;
        lastStyleJSON = json;
        sendToRN({ type: 'styleState', state });
      });
    }

    const editor = new Editor({
      element: document.querySelector('#editor'),
      extensions: [
        StarterKit.configure({
          heading:     { levels: [1, 2, 3] },
          bulletList:  { keepMarks: true, keepAttributes: false },
          orderedList: { keepMarks: true, keepAttributes: false },
          strike:      false,
          codeBlock:   false,
        }),
        Underline, Strike, TaskList,
        TaskItem.configure({ nested: true }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Link.configure({ openOnClick: false }),
        Highlight.configure({ multicolor: true }),
        Subscript, Superscript,
        Placeholder.configure({ placeholder: 'Start writing...' }),
        ImageWithSize,
        Table.configure({ resizable: false }),
        TableRow, TableHeader, TableCell,
        CodeBlockLowlight.configure({ lowlight }),
      ],

      content: '',

      onUpdate: ({ editor }) => {
        scheduleContentChange(editor.getHTML(), editor.getText());
        broadcastStyleState(editor);
      },
      onSelectionUpdate: ({ editor }) => broadcastStyleState(editor),
      onFocus: () => sendToRN({ type: 'focus' }),
      onBlur: ({ editor }) => {
        flushContentChange(editor.getHTML(), editor.getText());
        sendToRN({ type: 'blur' });
      },
    });

    window.editorBridge = {
      handleMessage(raw) {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }
        const ch = () => editor.chain().focus();

        switch (msg.type) {

          case 'init':
            applyTheme(msg.colors, msg.isDark);
            if (msg.html) editor.commands.setContent(msg.html, false);
            sendToRN({ type: 'initialized' });
            break;

          case 'setTheme':
            applyTheme(msg.colors, msg.isDark);
            break;

          case 'setContent':
            editor.commands.setContent(msg.html || '', false);
            break;

          case 'getHTML':
            sendToRN({ type: 'htmlResponse', requestId: msg.requestId, html: editor.getHTML() });
            break;

          case 'toggleBold':          ch().toggleBold().run();                    break;
          case 'toggleItalic':        ch().toggleItalic().run();                  break;
          case 'toggleUnderline':     ch().toggleUnderline().run();               break;
          case 'toggleStrike':        ch().toggleStrike().run();                  break;
          case 'toggleH1':            ch().toggleHeading({ level: 1 }).run();     break;
          case 'toggleH2':            ch().toggleHeading({ level: 2 }).run();     break;
          case 'toggleH3':            ch().toggleHeading({ level: 3 }).run();     break;
          case 'toggleUnorderedList': ch().toggleBulletList().run();              break;
          case 'toggleOrderedList':   ch().toggleOrderedList().run();             break;
          case 'toggleCheckboxList':  ch().toggleTaskList().run();                break;
          case 'toggleBlockQuote':    ch().toggleBlockquote().run();              break;
          case 'toggleCodeBlock':     ch().toggleCodeBlock().run();               break;
          case 'toggleHighlight':     ch().toggleHighlight().run();               break;
          case 'setTextAlign':        ch().setTextAlign(msg.align).run();         break;

          case 'insertImage':
            ch().setImage({ src: msg.url, width: msg.width, height: msg.height }).run();
            break;

          case 'updateImageSrc': {
            const { state, dispatch } = editor.view;
            state.doc.descendants((node, pos) => {
              if (node.type.name === 'image' && node.attrs.src === msg.oldSrc) {
                dispatch(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: msg.newSrc }));
                return false;
              }
            });
            break;
          }

          case 'focus':
            editor.commands.focus();
            break;

          case 'blur':
            editor.commands.blur();
            break;

          case 'setTitle':
            break;

          case 'setFontSettings':
            if (msg.fontSize) {
              document.querySelector('.tiptap').style.fontSize = msg.fontSize + 'px';
            }
            break;

          case 'scrollToTop':
            window.scrollTo(0, 0);
            break;
        }
      },
    };

    sendToRN({ type: 'ready' });
  </script>
</body>
</html>`
}
