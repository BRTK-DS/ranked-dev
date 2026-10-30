# Editor language support

Language tools run in the browser; deployment uses the existing Vercel project.
No database changes, credentials or additional server are required.

The task's `language` selects the Monaco language, file extension and validator.
Each task owns a separate model URI. Unknown languages use plain text, never
JavaScript. Validators do not execute the submitted program.

| Task language | Diagnostics | Completion support |
| --- | --- | --- |
| JavaScript / TypeScript | Built-in Monaco language service | Built-in Monaco IntelliSense |
| JSON | Built-in Monaco JSON service | Built-in JSON service |
| HTML | HTML-validate: syntax, closing order, duplicate attributes | Built-in Monaco HTML service |
| C# | Tree-sitter C# grammar in WebAssembly | Keyword suggestions; no Roslyn/.NET type resolution |
| PHP | Tree-sitter PHP grammar in WebAssembly | Keywords / selected built-ins; no Composer or framework type resolution |
| SQL | node-sql-parser, **MySQL dialect** | SQL keywords; no database schema awareness |
| GraphQL | GraphQL syntax parser | Keywords; no API schema validation |
| XML / XSLT | Browser XML well-formedness parser | Basic XML/XSLT names; no XSD or XSLT semantic validation |
| XPath | Browser **XPath 1.0** expression parser | Dedicated highlighting, axes and function names |

XPath prefixes receive placeholder namespace URIs during syntax validation.
This checks syntax only, not whether a prefix exists in the task's document.
Browser XML errors include the parser's location in the message; the marker is
attached to line 1 because browsers do not expose a uniform structured location.

These tools are syntax diagnostics, not full semantic language servers or a
multi-language execution engine. C# methods and PHP framework symbols require
project references and a separate language service to resolve accurately.
The existing Run tests engine is unchanged by this editor integration.

## Build and verification

`npm run dev` and `npm run build` generate `public/language-tools/` automatically.
Only C# and PHP grammars are copied; generated assets are not tracked in Git.
Keep `web-tree-sitter` at 0.20.8 while using these precompiled grammars.

`npm run test:languages` builds the assets and launches headless Edge to test
valid, invalid and corrected code for each custom parser in real Monaco.
Set `TEST_BROWSER_CHANNEL=chrome` to use installed Chrome instead.

Worker checks are debounced, bounded to 100,000 characters and discarded when
out of date. Workers and completion providers are disposed when leaving a task.
An unavailable or timed-out parser is shown in the editor status; its failure
is never presented as a syntax error in the user's code.
