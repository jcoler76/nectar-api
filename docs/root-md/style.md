# Design System Preferences & Guidelines

## Color System

## Ocean Gradient Pattern
- **Implementation**: `linear-gradient(135deg, #0c4a6e 0%, #38bdf8 100%)`
- **Class**: `bg-ocean-gradient`
- **Colors**: Deep navy (#0c4a6e) to bright sky blue (#38bdf8)

### Primary Ocean Theme
- **Primary**: Ocean Blue 600 (#0284c7) - main actions, headers, and branding
- **Secondary**: Light Ocean (#e0f2fe) - supporting elements  
- **Accent**: Bright Ocean (#38bdf8) - highlights and calls-to-action
- **Destructive**: Standard Red (#ef4444) - errors and dangerous actions

### Title Styling Standards
- **Color Standard**: All chart titles, dashboard titles, and page titles use **Ocean Blue 800** (#075985)
- **Tailwind Class**: `text-ocean-800`
- **Application**: Apply to all main titles, headers, chart labels, and navigation section labels
- **Implementation Examples**:
  - Chart titles: `<CardTitle className="text-ocean-800 flex items-center gap-2">`
  - Page headers: `<h1 className="text-3xl font-bold text-ocean-800 mb-2">`
  - Dashboard sections: `<h2 className="text-2xl font-bold text-ocean-800 mb-4">`

### Interactive Elements Styling Standards
- **Color Standard**: All back buttons, search buttons, and filter controls use **Ocean Blue 500** (#0ea5e9)
- **Tailwind Classes**: `bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500`
- **Application**: Apply to search buttons, back navigation buttons, and primary filter controls
- **Implementation Examples**:
  - Search buttons: `<Button className="bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500">`
  - Back buttons: `<Button className="bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500">`
  - Filter controls: `<Button className="bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500">`

### Background Colors
- **Table Headers**: `bg-gray-50` - provides subtle background differentiation for table headers
- **Card Backgrounds**: `bg-gray-50` - creates subtle background for card containers and content areas
- **Usage**: Apply to `<TableHead>` elements, card wrappers, content sections, or page backgrounds
- **Implementation Notes**: Gray-50 (`#f9fafb`) provides excellent contrast with white text areas

## Navigation Design

### Navigation Bar
- **Background**: Ocean gradient (bg-ocean-gradient) - beautiful blue gradient from design system
- **Height**: h-14 (56px) - standard navigation height for optimal click targets and visual balance
- **Text Colors**: 
  - Active items: White text with subtle background highlight (bg-white/20)
  - Inactive items: Light blue (text-blue-100) with transparent background, hover to white
  - Logo/Brand: White text for contrast against gradient
- **Effects**: Smooth transitions with border-blue-200 on hover, subtle shadow (shadow-sm)
- **Border Radius**: Small rounding (rounded-sm) for navigation buttons
- **Responsive**: Collapses appropriately on mobile with hidden navigation on small screens

### Active State Styling
- **Background Highlight**: Semi-transparent white background (bg-white/20) for active items
- **Text Color**: Pure white (text-white) for maximum contrast
- **Border Radius**: Small rounding (rounded-sm) for subtle button appearance
- **Hover Effects**: Smooth transitions between states (transition-colors)

### Inactive State Styling
- **Background**: Transparent (no background color) for inactive items
- **Text Color**: Light blue (text-blue-100) for subtle visibility
- **Hover State**: Background changes to semi-transparent white (bg-white/10) with text color transitioning to white
- **Border Radius**: Small rounding (rounded-sm) matching active state

### Navigation Structure
- **Container**: Full width with proper padding (px-4) and flex layout
- **Logo Section**: Left-aligned with icon and brand text
- **Navigation Links**: Center-positioned for primary navigation items
- **Secondary Actions**: Right-aligned for settings, search, and user actions
- **Mobile Behavior**: Hidden navigation items on small screens with responsive breakpoints

### Tab Bar Design Standards

#### Full-Width Implementation
- **Container Structure**: Tab bars must span the full viewport width
- **Implementation**: Use CSS Grid with even column distribution
- **Page Structure**: 
  - Full-width container wrapper
  - Inner content container for proper content alignment
  - Tab bar breaks out of content container to achieve full width

#### Tab Bar Styling
- **Container Background**: bg-blue-50 (hex: #eff6ff)
- **Active Tab**: Ocean gradient background (bg-ocean-gradient) with white text
- **Inactive Tab**: Muted foreground color (text-muted-foreground)
- **Grid Layout**: Dynamic grid columns based on tab count (grid-cols-2, grid-cols-3, etc.)
- **Padding**: Container padding of p-1, individual tab padding of px-4 py-3

#### Implementation Requirements
- Use CSS Grid for even spacing, not Flexbox
- Apply inline styles when CSS classes conflict
- Ensure tabs are buttons, not Radix UI components when full control is needed
- Round corners: rounded-md for container, rounded-sm for individual tabs

## Component Design Standards

### Field Rounding Hierarchy (4-Level System)
- **rounded-lg (10px)**: Primary actions, main containers, hero elements
  - Use for: Save buttons, view buttons, main action buttons, primary cards, hero sections, important CTAs
- **rounded-md (6px)**: Form controls, secondary elements, content containers, tabs
  - Use for: All form inputs, FloatingLabelInput fields, tabs, secondary buttons, content cards
- **rounded-sm (2px)**: Table controls, micro-interactions, minimal UI elements
  - Use for: Table filter dropdowns, sort controls, pagination buttons, toolbar icons, table action buttons
- **rounded-full**: Circular elements, badges, avatars, pills
  - Use for: Status badges, user avatars, pill-shaped buttons, notification dots

### Floating Label Input Fields
- **Component**: FloatingLabelInput.tsx - Enhanced form input with animated floating label
- **Features**:
  - Smooth label animation that floats above input when focused or filled
  - Ocean theme integration with ocean-500 focus border colors
  - Support for multiple input types (text, email, tel, number, date, password, url)
  - Validation state display with required field indicators
  - Accessibility compliance with proper ARIA labels
- **Usage**: Use FloatingLabelInput for all standard form inputs

### Card System Guidelines

#### Card Style Preferences
- **Default Style**: Enhanced cards (stronger shadows and better hover effects)
- **Alternative Styles**: Use minimal, elevated, gradient, or ocean theme only when contextually appropriate

#### Card Background Colors by Size
- **Large Cards**: Always use pure white (#ffffff) backgrounds
- **Medium Cards**: Use light gray (#f8fafc) or acceptable pastels
- **Small Cards**: Use light grays or soft pastels

#### Dashboard Metric Cards Typography
- **Title Text**: Always use black (text-black) for card titles
- **Number Display**: Use solid colors for main metric numbers:
  - Purple solid (text-purple-600) for service metrics
  - Green solid (text-green-600) for connection/health metrics  
  - Blue solid (text-blue-600) for activity/request metrics
  - Rose solid (text-rose-600) for time/uptime metrics
- **Subtitle Text**: Use complementary lighter pastels that correlate to the color of the metric card numbers (purple-500, green-500, blue-500, rose-500)

#### Acceptable Pastel Colors for Cards
- Soft Lavender (#f3f0ff), Light Mint (#f0fdf4), Pale Peach (#fef7ed)
- Soft Sky (#f0f9ff), Gentle Rose (#fdf2f8), Light Cream (#fffbeb)
- Pale Sage (#f6f7f4), Soft Periwinkle (#f1f5f9)

### DataCard Component - Field-Heavy Card Design System

A generic, reusable card component designed for displaying structured data with consistent alignment and visual hierarchy.

#### Design Principles
- **Consistent Height**: All cards maintain uniform height in grid layouts
- **Fixed Alignment**: Bottom sections align perfectly across cards
- **Icon-Based Fields**: Visual identification for different data types
- **Clear Visual Hierarchy**: Structured content organization
- **Flexible Content**: Accommodates varying amounts of data

#### Color Guidelines

##### Ocean Theme Integration
- **Primary**: #0284c7 (ocean-600) - Main titles and headers
- **Dark**: #075985 (ocean-800) - Dark titles for high contrast
- **Interactive**: #0ea5e9 (ocean-500) - Interactive elements

##### Icon Color System
- **Building/Company**: text-indigo-500
- **Money/Financial**: text-emerald-600
- **User/People**: text-purple-500
- **Calendar/Date**: text-orange-500
- **Status/State**: text-blue-500
- **General/Default**: text-gray-500

##### Badge Color Variants
- **Neutral**: border-indigo-200 text-indigo-700
- **Success**: bg-green-500 text-white
- **Error**: bg-red-500 text-white
- **Active**: bg-blue-300 text-gray-800

##### Background Colors
- **Card**: bg-white
- **Container**: bg-neutral-50
- **Hover**: hover:bg-gray-50
- **Border**: border-gray-200

#### Component Structure

##### Props
- **title**: Main title/name
- **subtitle**: Secondary text (company, category, etc.)
- **subtitleIcon**: Icon for subtitle
- **fields**: Array of field objects with icon, value, color
- **badges**: Array of badge objects with text, variant, position
- **fixedRows**: Array of fixed-height row content
- **onMenuClick**: Menu button click handler
- **className**: Additional CSS classes

##### Field Object Properties
- **icon**: Lucide icon component
- **iconColor**: Semantic color class
- **value**: Field value to display
- **color**: Text color class
- **large**: Large emphasis styling
- **truncate**: Text truncation for overflow

##### Badge Object Properties
- **component**: Styled badge component
- **position**: 'left' | 'right'

##### Fixed Row Object Properties
- **label**: Emphasized label (cyan-600)
- **content**: Content text
- **placeholder**: Placeholder for empty state

#### Grid Layout
- **Mobile** (< 768px): Single column
- **Tablet** (768px+): Two columns
- **Desktop** (1024px+): Three columns
- **Large** (1280px+): Four columns

#### Best Practices

##### Do's
- ✅ Use semantic icon colors consistently across data types
- ✅ Apply `flex-shrink-0` to icons to prevent distortion
- ✅ Use fixed heights (`h-5`) for bottom row alignment
- ✅ Implement text truncation for long content
- ✅ Provide meaningful placeholder text for empty states
- ✅ Follow the established ocean color theme
- ✅ Use black text for card titles and solid colors for metric numbers

##### Don'ts
- ❌ Mix inconsistent heights in grid rows
- ❌ Use arbitrary colors outside the established schema
- ❌ Omit truncation on potentially long text fields
- ❌ Overcrowd cards with excessive field counts
- ❌ Ignore hover and focus states for accessibility

## Interactive Effects & Animations

### Preferred Effects
- **Primary Interactive Effect**: Hover Glow (smooth and subtle glow effect on hover)
- **Secondary Effects**: Use hover-lift, press-effect, or hover-slide only when glow is not appropriate
- **Animation Duration**: 200-300ms for smooth transitions

### Shadow Hierarchy
- **Subtle**: For minimal elevation needs
- **Small Modern**: Standard card elevation
- **Medium Modern**: Featured content
- **Large Modern**: Important dialogs/modals
- **Extra Large Modern**: Critical notifications

## Icon System Guidelines

### Icon Display & Colors
- **Show Icons**: Always display icons on cards and relevant UI elements
- **Color Strategy**: Use semantic colors that match content context
- **Pastel Alternative**: When context colors are too strong, use soft pastel versions
- **Examples**:
  - Company/Building: Soft gray or pale sage
  - Money/Dollar: Soft mint or gentle green
  - Calendar/Date: Soft sky or pale blue
  - Users/People: Gentle rose or soft lavender

### Icon Sizing Rules
- **Default Size**: Medium (h-4 w-4)
- **Large Cards**: Medium or Large icons (h-4 w-4 or h-5 w-5)
- **Medium Cards**: Medium icons (h-4 w-4)
- **Small Cards**: Small or Medium icons (h-3 w-3 or h-4 w-4)

## Chart & Graph Content Styling Guidelines

### Chart Title Standards
- **Color**: All chart titles must use **Ocean Blue 800** (`#075985`) / `text-ocean-800`
- **Application**: Apply to all chart titles, axis labels, and legend headers
- **Examples**:
  - `<CardTitle className="text-ocean-800">Chart Title</CardTitle>`
  - Chart axis labels: `tick={{ fill: '#075985' }}`

### Chart Data Visualization Colors

#### Primary Color Palette for Charts
Use a combination of vibrant primary colors and soft pastels for optimal readability and visual appeal:

**Primary Colors (for main data series):**
- **Emerald**: `#10b981` (emerald-500) - for positive metrics, growth, success
- **Blue**: `#3b82f6` (blue-500) - for neutral data, general metrics
- **Purple**: `#8b5cf6` (purple-500) - for engagement, activity metrics
- **Rose**: `#f43f5e` (rose-500) - for alerts, important metrics
- **Amber**: `#f59e0b` (amber-500) - for warnings, pending states
- **Indigo**: `#6366f1` (indigo-500) - for secondary metrics

**Pastel Colors (for supporting data or backgrounds):**
- **Soft Mint**: `#6ee7b7` (emerald-300) - light green complement
- **Sky Blue**: `#93c5fd` (blue-300) - light blue complement  
- **Lavender**: `#c4b5fd` (purple-300) - light purple complement
- **Blush**: `#fda4af` (rose-300) - light pink complement
- **Cream**: `#fcd34d` (amber-300) - light yellow complement
- **Periwinkle**: `#a5b4fc` (indigo-300) - light indigo complement

#### Color Application Rules

**Bar Charts & Column Charts:**
- Use primary colors for main data series
- Use pastels for secondary or comparative data
- Apply subtle gradients when appropriate for depth

**Line Charts:**
- Primary colors for main trend lines (stroke width 2-3px)
- Pastels for background areas or secondary lines
- Ensure sufficient contrast between multiple lines

**Pie Charts & Donut Charts:**
- Rotate through primary colors first, then pastels
- Maintain visual hierarchy with color intensity
- Use white borders (`stroke="#ffffff"`) for segment separation

**Area Charts:**
- Primary colors for stroke lines
- Matching pastels with low opacity (0.2-0.4) for fill areas
- Layer pastels behind primary colors

#### Forbidden Colors
- **Never use pure black** (`#000000`) for any chart elements
- **Avoid dark grays** darker than `#374151` (gray-700)
- **No pure white data points** on white backgrounds

#### Grid Lines & Axes
- **Grid Lines**: Use light gray (`#e5e7eb` / gray-200) or light ocean (`#bae6fd` / ocean-200)
- **Axis Text**: Use ocean-700 (`#0369a1`) for readability
- **Axis Lines**: Optional, use same color as grid lines if needed

#### Interactive Elements
- **Hover States**: Slightly darken the original color by 10-15%
- **Selection States**: Add subtle glow or border in matching color
- **Tooltips**: White background with subtle shadow and ocean-800 text

#### Data Point Styling
- **Dots/Points**: Use solid primary colors with white stroke for visibility
- **Radius**: 3-4px for line chart points, 2-3px for scatter plots
- **Active States**: Increase radius by 1-2px on hover

#### Legend Styling
- **Text Color**: Ocean-700 (`#0369a1`) for consistency
- **Icons**: Use small squares (8x8px) or circles matching chart colors
- **Spacing**: Adequate spacing between legend items for touch accessibility

### Implementation Examples

**Line Chart Colors:**
```jsx
const chartConfig = {
  revenue: { label: 'Revenue', color: '#10b981' }, // emerald-500
  expenses: { label: 'Expenses', color: '#f43f5e' }, // rose-500
  profit: { label: 'Profit', color: '#3b82f6' }, // blue-500
};
```

## Filter Bar Design System

### Overview
This document defines the standard design specifications for filter bars across the application to ensure consistency and maintainability.

### Layout Structure and Component Order

#### Overall Container Layout
- **Container**: Full-width container with padding on all sides
- **Main Layout**: Two-section horizontal layout
- **Left Section**: Filters and pagination controls
- **Right Section**: Action buttons and view controls
- **Responsive**: Elements wrap to new lines on smaller screens with maintained order

#### Left Section Component Order (Left to Right)
1. **Connected Filter Dropdowns** - Primary filtering controls grouped together
2. **Pagination Info Display** - Shows current range and total count
3. **Pagination Navigation Controls** - Previous/next page buttons

#### Right Section Component Order (Left to Right)
1. **Refresh Button** - Data refresh control
2. **Settings Button** - Configuration options
3. **Sort Button** - Sorting options dropdown
4. **Connected View Toggle Buttons** - Table and card view switches
5. **Filter Button** - Advanced search and Filter access
6. **Views Button** - Saved views management

### Detailed Positioning Specifications

#### Left Section Alignment
- **Primary Alignment**: Left-aligned within container
- **Internal Spacing**: 8px gaps between major component groups
- **Vertical Alignment**: All components centered vertically
- **Wrap Behavior**: Components wrap to new line maintaining left alignment

#### Right Section Alignment
- **Primary Alignment**: Right-aligned within container
- **Internal Spacing**: 4px gaps between individual action buttons
- **Button Grouping**: Related buttons (like view toggles) are visually connected
- **Wrap Behavior**: Entire right section moves below left section on mobile

### Container Specifications
- **Padding**: 16px (1rem) on all sides
- **Border**: Bottom border only, light gray color
- **Background**: White
- **Display**: Flexible layout with space-between for left and right sections
- **Min-Height**: 68px to accommodate all components with padding

### Connected Filter Dropdowns Positioning
- **Position**: First element in left section
- **Connection Style**: Multiple dropdowns visually connected as one unit
- **Container Border**: Single border around entire group, medium gray color
- **Container Rounding**: Medium radius (6px)
- **Individual Borders**: No borders between connected filters
- **Individual Rounding**: No rounding on individual filters within group
- **Horizontal Flow**: Filters flow left to right within connected container

#### Individual Filter Specifications
- **Height**: 36px fixed height
- **Background**: Pure white
- **Text Size**: Small (14px)
- **Minimum Width**: 160px per filter
- **Padding**: Internal padding for comfortable text spacing
- **Order**: Most important filters positioned leftmost

#### Dropdown Menu Specifications
- **Background**: Pure white with solid background (not transparent)
- **Border**: Light gray border
- **Shadow**: Subtle drop shadow for depth
- **Z-Index**: High value (50+) to appear above other elements
- **Rounding**: Small radius to match overall design
- **Positioning**: Drops down below trigger element

### Pagination Section Positioning
- **Position**: Second group in left section, after filters
- **Info Display Position**: Before navigation controls
- **Controls Position**: Immediately after info display

#### Pagination Info Display
- **Text Color**: Medium gray
- **Text Size**: Small (14px)
- **Format**: "X-Y of Z" pattern
- **Vertical Alignment**: Centered with other elements

#### Pagination Controls
- **Button Count**: Two buttons (previous and next)
- **Button Order**: Previous (left), Next (right)
- **Button Size**: 36px square buttons
- **Button Style**: Outline style with no internal padding
- **Rounding**: Small radius (2px)
- **Icons**: Chevron left and right arrows
- **Icon Size**: 16px
- **Disabled State**: Visual indication when navigation not available
- **Connection**: Buttons directly adjacent with no gap

### Action Button Section Positioning
- **Position**: Right section of container
- **Flow Direction**: Left to right
- **Alignment**: Right-aligned within container
- **Button Height**: 36px consistent across all buttons

#### Action Button Order and Specifications
1. **Refresh Button** (First)
   - Square outline button with refresh icon
   - 36px square, outline style, small radius (2px)
   
2. **Settings Button** (Second)
   - Square outline button with gear icon
   - 36px square, outline style, small radius (2px)
   
3. **Sort Button** (Third)
   - Square outline button with sort arrows icon
   - 36px square, outline style, small radius (2px)
   
4. **Connected View Toggle Buttons** (Fourth - as connected group)
   - Table view button (left), Card view button (right)
   - 36px square each, connected with shared border
   - Active/inactive states for current view
   
5. **Search Button** (Fifth)
   - Filled button with brand colors and search icon
   - Ocean blue background, white text, horizontal padding
   
6. **Views Button** (Last)
   - Outline button with text only
   - Horizontal padding for text content

#### Action Button Group Specifications
- **Individual Spacing**: 4px gaps between separate buttons
- **Connected Elements**: No gaps within connected groups (view toggles)
- **Icon Size**: 16px for all icons
- **Padding**: No internal padding for square buttons, horizontal padding for text buttons

### Connected View Toggle Buttons Positioning
- **Position**: Fourth in right section action button sequence
- **Container**: Single border around entire group
- **Container Rounding**: Small radius (2px)
- **Button Order**: Table view (left), Card view (right)
- **Individual Rounding**: No rounding on individual buttons
- **Active State**: Default button style for selected view
- **Inactive State**: Ghost button style for unselected views
- **Connection**: No gap between the two buttons

### Search and Views Button Positioning
- **Search Button Position**: Fifth in right section (penultimate)
- **Views Button Position**: Last element in right section
- **Separation**: Both buttons have standard 4px spacing from adjacent elements

### Color Specifications
- **Primary Brand**: Ocean blue tones
- **Search Button**: Ocean blue background (#0ea5e9)
- **Search Button Hover**: Darker ocean blue (#0284c7)
- **Borders**: Light gray (#d1d5db)
- **Text**: Dark gray for labels, medium gray for secondary text
- **Backgrounds**: Pure white for interactive elements

### Size Specifications
- **Universal Height**: 36px for all interactive elements
- **Icon Size**: 16px for all icons
- **Text Size**: 14px for all text elements
- **Minimum Width**: 160px for dropdown filters
- **Container Padding**: 16px on all sides
- **Element Spacing**: 8px between major groups, 4px between action buttons

### Responsive Positioning Behavior
- **Desktop (1024px+)**: Single row with left and right sections
- **Tablet (768px-1024px)**: May wrap right section below left section
- **Mobile (<768px)**: Stacked layout with left section above right section
- **Component Order Preservation**: Order within each section remains consistent across breakpoints
- **Minimum Sizes**: All interactive elements maintain minimum touch targets (44px minimum)

### Z-Index Layering
- **Dropdown Menus**: Z-index 50+ (highest priority)
- **Action Button Tooltips**: Z-index 40
- **Filter Bar Container**: Z-index 10
- **Base Content**: Z-index 1

### Implementation Notes
- **Consistency**: All filter bars must follow this exact component order
- **Flexibility**: System allows for different numbers of filters while maintaining position rules
- **Accessibility**: Tab order follows visual left-to-right, top-to-bottom flow
- **Performance**: Lightweight positioning that doesn't impact page performance
- **Maintenance**: Clear positioning rules make it easy to add or remove components

## Standard Table Functionality Guidelines

All data tables in this application should adhere to the following standards for a consistent and powerful user experience. The implementation uses custom React components styled with Tailwind CSS, built upon shadcn/ui's accessible table primitives.

### 1. Column Management

#### Drag-and-Drop Reordering
- **Functionality**: Users must be able to click and drag column headers to reorder them.
- **Visual Feedback**: A visual indicator (e.g., a semi-transparent clone of the header) should follow the cursor during the drag operation.
- **Persistence**: The chosen column order must be saved to the browser's `localStorage` and restored automatically on subsequent visits.

#### Resizable Columns
- **Functionality**: Users must be able to resize columns by dragging the right border of the header.
- **Cursor Indicator**: The cursor should change to a `col-resize` icon when hovering over the draggable border.
- **Minimum Width**: Columns must have a minimum width of `80px` to maintain readability.
- **Persistence**: Custom column widths must be saved to `localStorage` and be applied on page load.

### 2. Data Sorting

#### Click-to-Sort
- **Functionality**: Clicking a column header should sort the table data by that column.
- **Sort Order**:
    - First click: Sorts in **ascending** order.
    - Second click on the same header: Sorts in **descending** order.
- **Visual Indicator**: An arrow icon (`↑` for ascending, `↓` for descending) must appear next to the currently sorted column's title.

### 3. Styling and Layout

#### Row and Text Styling
- **Row Height**: Table cells (`TableCell`) should have `py-2.5` (`10px` top/bottom padding) to ensure consistent row height.
- **Header Height**: Table headers (`TableHead`) must have a fixed height of `h-11` (`44px`).
- **Font Size**: The default font size for all table content is `text-sm` (`14px`).
- **Hover State**: Rows must have a `hover:bg-gray-50` effect to provide visual feedback on mouseover.

#### Button Styling
- **Avoid Black Pills**: Never use black pill buttons anywhere in the table.

#### Header Styling
- **Text Handling**: Header titles must wrap to a new line if the text is too long for the column's width. Text should not be truncated with ellipses.
- **Background**: Headers should use `bg-gray-50` for the background and `text-muted-foreground` for the text color to differentiate them from the table body.

### Color-Coded Elements (Badges & Avatars)
To improve scannability, specific data points should use color-coded visual elements based on the application's primary color theme.

- **Status & Stage Badges ("Pill Buttons")**:
    - **Component**: Use the `Badge` component for displaying status (e.g., Open, Won, Lost) and stage (e.g., Discovery, Proposal).
    - **Color Strategy**: Colors must be semantic and consistent, following the design system guidelines:
        - **Green (`variant="green"`)**: For positive outcomes (e.g., "Won", "Closed Won").
        - **Red (`variant="red"`)**: For negative outcomes (e.g., "Lost", "Closed Lost").
        - **Blue (`variant="blue"`)**: For informational or neutral states (e.g., "Open", "Discovery").
        - **Orange/Yellow (`variant="orange"`/`variant="yellow"`)**: For in-progress or attention-needed states (e.g., "1st Demo", "Negotiation").
        - **Purple (`variant="purple"`)**: For key milestones (e.g., "Proposal").

- **Assigned Representative Avatars**:
    - **Component**: Use a circular `UserAvatar` component to display the assigned representative.
    - **Display**: The avatar should contain the user's initials.
    - **Color Strategy**: The background color of the avatar must be programmatically and consistently generated based on the representative's name. This ensures that a specific rep always has the same color, making them easily identifiable across the application.

## Implementation Guidelines

### Component Creation Standards
- Always respect enhanced card style as default
- Apply hover glow effects to interactive elements
- Use appropriate card backgrounds based on size
- Include contextual icons with proper sizing
- Maintain consistency with ocean color theme
- Follow dashboard metric card typography rules
- Apply ocean-600 color to all titles and headers

### Accessibility Requirements
- Ensure proper contrast ratios
- Include focus states for all interactive elements
- Maintain keyboard navigation support
- Use semantic HTML elements

### Responsive Design
- Cards adapt gracefully across screen sizes
- Icon sizes adjust based on viewport
- Maintain readability and usability on all devices
- Navigation collapses appropriately on mobile

## Common Applications
- **Dashboard cards**: Large white cards with medium contextual icons and hover glow
- **Dashboard metrics**: Black titles, solid color numbers, complementary pastel descriptions
- **List items**: Small cards with pastels, small icons, and subtle glow effects
- **Feature cards**: Enhanced style with appropriate pastel accents and contextual icons
- **Navigation**: Ocean blue gradient theme with clean, modern styling
- **Page titles**: Ocean-600 color for consistent branding across all pages and charts
- **Table headers**: Gray-50 background for subtle differentiation
- **Form fields**: FloatingLabelInput with ocean theme integration