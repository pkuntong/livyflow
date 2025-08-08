# LivyFlow Design System

A comprehensive design system for the LivyFlow personal finance application, built with React and Tailwind CSS.

## Overview

The LivyFlow Design System provides a cohesive set of reusable UI components, design tokens, and patterns that ensure consistency across the application. All components are built with accessibility in mind and follow WCAG guidelines.

## Installation & Setup

```bash
# Install required dependencies
npm install clsx tailwind-merge lucide-react

# Import the design system
import { Button, Card, Modal } from './design-system';
```

## Design Tokens

Our design system is built on a foundation of design tokens that define colors, typography, spacing, and other design properties.

### Colors

We use semantic color naming with support for light/dark themes:

- **Primary**: Emerald colors for financial growth and success
- **Secondary**: Blue colors for trust and reliability  
- **Neutral**: Gray scale for text and backgrounds
- **Semantic**: Success, Warning, Error, and Info colors

### Typography

- **Font Family**: Inter for sans-serif, JetBrains Mono for monospace
- **Font Sizes**: xs (12px) to 5xl (48px) with appropriate line heights
- **Font Weights**: thin (100) to black (900)

### Spacing

Based on a 4px grid system with consistent spacing tokens from 0px to 128px.

## Components

### Button

A flexible button component with multiple variants and states.

```jsx
import { Button } from './design-system';

// Basic usage
<Button>Click me</Button>

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="base">Default</Button>
<Button size="lg">Large</Button>

// States
<Button loading>Loading...</Button>
<Button disabled>Disabled</Button>

// With icons
<Button leftIcon={<Plus />}>Add Item</Button>
<Button rightIcon={<ArrowRight />}>Continue</Button>
<Button iconOnly><Settings /></Button>
```

#### Button Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'danger' \| 'success' \| 'warning'` | `'primary'` | Button style variant |
| `size` | `'sm' \| 'base' \| 'lg' \| 'xl'` | `'base'` | Button size |
| `loading` | `boolean` | `false` | Show loading spinner |
| `disabled` | `boolean` | `false` | Disable button |
| `iconOnly` | `boolean` | `false` | Style as icon-only button |
| `leftIcon` | `ReactNode` | - | Icon on the left |
| `rightIcon` | `ReactNode` | - | Icon on the right |

### Input Components

Form input components with validation states and accessibility features.

```jsx
import { Input, FormField, Textarea } from './design-system';

// Basic input
<Input placeholder="Enter text" />

// With validation states
<Input state="error" />
<Input state="success" />
<Input state="warning" />

// Form field with label and help text
<FormField 
  label="Email Address" 
  required
  helperText="We'll never share your email"
  errorMessage="Please enter a valid email"
>
  <Input type="email" placeholder="john@example.com" />
</FormField>

// Textarea
<Textarea 
  rows={4} 
  placeholder="Enter your message..." 
  resize="vertical" 
/>

// Input with icons
<Input 
  leftIcon={<Search />}
  placeholder="Search..." 
/>
<Input 
  type="password" 
  placeholder="Enter password" 
/>
```

#### Input Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'base' \| 'lg'` | `'base'` | Input size |
| `variant` | `'default' \| 'filled' \| 'underlined'` | `'default'` | Input style variant |
| `state` | `'default' \| 'error' \| 'success' \| 'warning'` | `'default'` | Validation state |
| `leftIcon` | `ReactNode` | - | Icon on the left |
| `rightIcon` | `ReactNode` | - | Icon on the right |

### Card Components

Flexible card containers with composition patterns.

```jsx
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardContent, 
  CardFooter,
  CardActions 
} from './design-system';

// Basic card
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
  <CardFooter>
    <CardActions>
      <Button>Action</Button>
    </CardActions>
  </CardFooter>
</Card>

// Interactive card
<Card 
  variant="elevated" 
  interactive="clickable"
  onClick={() => alert('Card clicked')}
>
  Content
</Card>
```

#### Card Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'elevated' \| 'outline' \| 'ghost'` | `'default'` | Card style variant |
| `size` | `'sm' \| 'base' \| 'lg'` | `'base'` | Card padding size |
| `interactive` | `'none' \| 'hover' \| 'clickable'` | `'none'` | Interactive behavior |

### Modal Components

Accessible modal dialogs with focus management.

```jsx
import { 
  Modal, 
  ModalHeader, 
  ModalTitle, 
  ModalDescription,
  ModalBody, 
  ModalFooter 
} from './design-system';

const [isOpen, setIsOpen] = useState(false);

<Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
  <ModalHeader onClose={() => setIsOpen(false)}>
    <ModalTitle>Confirm Action</ModalTitle>
    <ModalDescription>
      Are you sure you want to delete this item?
    </ModalDescription>
  </ModalHeader>
  <ModalBody>
    This action cannot be undone.
  </ModalBody>
  <ModalFooter>
    <Button variant="outline" onClick={() => setIsOpen(false)}>
      Cancel
    </Button>
    <Button variant="danger" onClick={handleDelete}>
      Delete
    </Button>
  </ModalFooter>
</Modal>
```

#### Modal Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'base' \| 'lg' \| 'xl' \| 'full'` | `'base'` | Modal size |
| `closeOnOverlayClick` | `boolean` | `true` | Close on backdrop click |
| `closeOnEscape` | `boolean` | `true` | Close on Escape key |

### Badge Components

Status and label components for various use cases.

```jsx
import { Badge, StatusBadge, CountBadge, PriorityBadge } from './design-system';

// Basic badges
<Badge>Default</Badge>
<Badge variant="primary">Primary</Badge>
<Badge variant="success">Success</Badge>

// Status badges with predefined statuses
<StatusBadge status="on-track" />
<StatusBadge status="over-budget" />
<StatusBadge status="pending" />

// Count badges
<CountBadge count={5} />
<CountBadge count={99} max={99} />

// Priority badges
<PriorityBadge priority="high" />
<PriorityBadge priority="critical" />
```

### Progress Components

Progress indicators for various use cases.

```jsx
import { Progress, BudgetProgress, LoadingProgress } from './design-system';

// Basic progress
<Progress value={75} max={100} />

// Budget-specific progress
<BudgetProgress 
  spent={750} 
  budget={1000}
  currency="$"
  showAmounts 
  showPercentage 
/>

// Loading progress
<LoadingProgress indeterminate />
<LoadingProgress value={50} />
```

### Toast Components

Notification toasts with enhanced theming.

```jsx
import { Toast, ToastAction } from './design-system';

// Basic toast
<Toast 
  message="Successfully saved!" 
  type="success"
  onClose={() => {}} 
/>

// Toast with action
<Toast
  title="New Update Available"
  message="A new version of the app is ready to install."
  type="info"
  action={
    <ToastAction onClick={handleUpdate}>
      Update Now
    </ToastAction>
  }
  onClose={() => {}}
/>
```

## Accessibility Features

All components include:

- **ARIA attributes** for screen readers
- **Keyboard navigation** support
- **Focus management** for modals and complex components
- **Color contrast** meeting WCAG AA standards
- **Semantic HTML** elements where appropriate

## Composition Patterns

### Financial Cards

```jsx
// Budget card example
<Card variant="default" interactive="hover">
  <CardHeader>
    <div className="flex justify-between">
      <CardTitle>Food & Dining</CardTitle>
      <StatusBadge status="on-track" />
    </div>
  </CardHeader>
  <CardContent>
    <BudgetProgress spent={450} budget={600} />
  </CardContent>
  <CardFooter>
    <CardActions align="right">
      <Button variant="ghost" size="sm">Edit</Button>
    </CardActions>
  </CardFooter>
</Card>
```

### Form Layouts

```jsx
// Modal form example
<Modal isOpen={isOpen} onClose={onClose}>
  <ModalHeader onClose={onClose}>
    <ModalTitle>Add New Budget</ModalTitle>
  </ModalHeader>
  <ModalBody className="space-y-4">
    <FormField label="Category" required>
      <Input placeholder="Enter category" />
    </FormField>
    <FormField label="Monthly Limit" required>
      <Input type="number" placeholder="0.00" />
    </FormField>
  </ModalBody>
  <ModalFooter>
    <Button variant="outline" onClick={onClose}>Cancel</Button>
    <Button variant="primary">Save</Button>
  </ModalFooter>
</Modal>
```

## Customization

### Extending Colors

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          900: '#0c4a6e',
        }
      }
    }
  }
}
```

### Custom Component Variants

```jsx
// Create custom button variant
<Button 
  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
>
  Custom Gradient
</Button>
```

## Performance

- **Tree shaking** supported for optimal bundle size
- **CSS-in-JS** avoided in favor of utility classes
- **Component composition** over large monolithic components
- **Lazy loading** recommendations for modal components

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

When adding new components:

1. Follow the existing component patterns
2. Include proper TypeScript definitions
3. Add accessibility features
4. Write comprehensive documentation
5. Include usage examples
6. Test across different screen sizes