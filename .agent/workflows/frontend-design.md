---
description: Create distinctive, production-grade frontend interfaces with high design quality
---

When the user asks to build web components, pages, or applications:
1. **Analyze Requirements**: Understand the goal, user needs, and required interactions.
2. **Review Design System**: Check `apps/web/globals.css` and `tailwind.config.js` for tokens.
3. **Plan Components**: Break down the UI into reusable components.
4. **Implement**:
   - Use `shadcn/ui` components where applicable.
   - Use `lucide-react` for icons.
   - Ensure responsive design (mobile-first).
   - Add micro-interactions and hover states.
5. **Aesthetics**:
   - Use modern typography (Inter/Geist).
   - Use subtle shadows and borders.
   - Avoid generic colors; use the project's HSL variables.

Example command to create a component:
```bash
# In apps/web
npx shadcn@latest add [component-name]
```
