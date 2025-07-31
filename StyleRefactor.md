# Style Refactor & Audit Checklist

## 🌟 Full Style Audit Checklist

### 1. Global Styles
- [ ] Remove unused or duplicate CSS from `styles.scss`.
- [ ] Ensure Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`) are at the top.
- [ ] Set a consistent base font and background color.
- [ ] Remove or refactor any global resets that conflict with Tailwind.

### 2. Tailwind Configuration
- [ ] Review `tailwind.config.js`:
  - [ ] Set your brand colors, font family, border radius, etc.
  - [ ] Ensure the `content` array includes all relevant file types (`.html`, `.ts`, `.scss`).
- [ ] Remove unused Tailwind plugins or add any you need (e.g., typography, forms).

### 3. Component Styles
- [ ] For each component:
  - [ ] Remove unused or redundant SCSS/CSS.
  - [ ] Replace custom classes with Tailwind utility classes in the template where possible.
  - [ ] Use `@apply` in SCSS for repeated utility patterns.
  - [ ] Remove inline styles in favor of Tailwind classes.

### 4. Layout & Spacing
- [ ] Use Tailwind’s spacing utilities (`p-4`, `m-2`, `gap-4`, etc.) for consistent padding/margin.
- [ ] Use Tailwind’s grid or flex utilities for layout (`flex`, `grid`, `justify-between`, etc.).
- [ ] Ensure consistent section/card/container widths (`max-w-`, `w-full`, etc.).

### 5. Typography
- [ ] Use Tailwind’s text utilities for headings, body, and captions (`text-xl`, `font-bold`, `text-gray-700`, etc.).
- [ ] Ensure heading hierarchy is consistent across pages.

### 6. Buttons & Forms
- [ ] Use Tailwind for button styles (`bg-blue-600`, `rounded`, `hover:bg-blue-700`, etc.).
- [ ] Use Tailwind’s form plugin or utilities for input, select, and textarea styling.
- [ ] Ensure focus and hover states are clear and accessible.

### 7. Tables & Lists
- [ ] Use Tailwind for table styling (`table-auto`, `w-full`, `border`, `bg-gray-50`, etc.).
- [ ] Ensure tables are responsive (`overflow-x-auto` on container).
- [ ] Use consistent row and header styles.

### 8. Navigation & Navbar
- [ ] Use Tailwind for navbar layout and link styles.
- [ ] Highlight the active route with a distinct style (`bg-white`, `text-blue-600`, etc.).
- [ ] Ensure navbar is sticky and responsive.

### 9. Cards & Modals
- [ ] Use Tailwind for card backgrounds, shadows, and rounded corners.
- [ ] Ensure modals (if any) use consistent overlay and content styles.

### 10. Responsiveness
- [ ] Use Tailwind’s responsive utilities (`md:`, `lg:`, etc.) for all layouts.
- [ ] Test all pages on mobile, tablet, and desktop.

### 11. Accessibility
- [ ] Ensure sufficient color contrast.
- [ ] All interactive elements (buttons, links) are keyboard accessible.
- [ ] Use semantic HTML where possible.

### 12. Remove Dead Code
- [ ] Delete any unused CSS/SCSS files.
- [ ] Remove commented-out or legacy styles.

### 13. Test & Polish
- [ ] Test in Chrome, Firefox, Safari, and on mobile.
- [ ] Check for visual bugs, overflow, or layout issues.
- [ ] Get feedback from a teammate or user.

---

## Bonus: Tailwind Best Practices
- Use [Tailwind Play](https://play.tailwindcss.com/) to prototype styles.
- Use `@apply` in SCSS for repeated button or card styles.
- Use Tailwind’s [Typography plugin](https://tailwindcss.com/docs/typography-plugin) for rich text content. 