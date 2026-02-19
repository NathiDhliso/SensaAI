# Futuristic Priming Zone - Quick Start Guide

## 🚀 Getting Started in 3 Steps

### Step 1: Import the Component
```tsx
import { FuturisticPrimingZone } from '@/features/priming-zone';
```

### Step 2: Add to Your Page
```tsx
function MyPage() {
  return <FuturisticPrimingZone />;
}
```

### Step 3: View the Demo
Navigate to `/priming-zone-demo` or use the `PrimingZoneDemo` page component.

## 🎨 What You'll See

### The Matrix View
- A sleek glassmorphic table with 3 columns (CREATE, CONFIGURE, MONITOR)
- Rows showing Azure concepts (Identity, Networking, Compute, Storage)
- Glowing dots indicating available priming cards
- Hover effects with neon glow

### The Drill-Down Card
Click any glowing dot to open a priming card with:
1. **🧠 The Trick** - Mental model for the task
2. **🔗 The Chain** - Prerequisites you need
3. **⚡ Atomic Steps** - Exact clicks to execute

## 🎯 Example: Creating a Storage Account

1. Find "Storage Account" row in the matrix
2. Click the glowing dot under "CREATE" column
3. Read the priming card:
   - **Trick**: "Name-Region-Redundancy trinity"
   - **Chain**: Active subscription, resource group, unique name
   - **Steps**: 8 exact clicks from portal to creation

## 🔧 Customization

### Use Your Own Data
```tsx
import type { ConceptMatrix } from '@/features/priming-zone';

const myMatrix: ConceptMatrix = {
  domain: 'AWS Administration',
  version: '1.0.0',
  concepts: [
    {
      id: 'ec2',
      name: 'EC2',
      children: [
        { id: 'ec2-instance', name: 'Instance' },
        { id: 'ec2-ami', name: 'AMI' },
      ],
    },
  ],
  cells: [
    {
      action: 'CREATE',
      conceptId: 'ec2-instance',
      conceptPath: ['EC2', 'Instance'],
      primingCard: {
        trick: {
          title: '🧠 The Trick',
          content: 'Your mental model here...',
        },
        chain: {
          title: '🔗 The Chain',
          constraints: ['Prerequisite 1', 'Prerequisite 2'],
        },
        steps: {
          title: '⚡ Atomic Steps',
          actions: ['Step 1', 'Step 2', 'Step 3'],
        },
      },
    },
  ],
};

<FuturisticPrimingZone matrix={myMatrix} />
```

### Add Close Handler
```tsx
<FuturisticPrimingZone 
  onClose={() => navigate('/dashboard')}
/>
```

## 🎨 Visual Features

### Glassmorphism
- Frosted glass panels with `backdrop-filter: blur(20px)`
- Semi-transparent backgrounds
- Layered depth effect

### Neon Glow
- Purple (#8a2be2) and Cyan (#00bfff) accents
- Glowing borders on hover
- Pulsing dot animations

### Animations
- Smooth slide-in for drill-down cards
- Staggered entrance for sections
- Scale transforms on hover
- Floating particle effects

## 📱 Responsive Design

The Priming Zone automatically adapts to:
- Desktop (1400px+ optimal)
- Tablet (768px - 1024px)
- Mobile (< 768px)

## 🎓 Learning Philosophy

### HOW, Not WHY
- Pure execution focus
- No explanations of concepts
- Just the steps to get it done

### Cognitive Load Management
- 3-section structure reduces overwhelm
- Visual hierarchy guides attention
- Progressive disclosure of information

### Schema Construction
- Mental models over memorization
- Pattern recognition
- Transferable knowledge

## 🔍 Troubleshooting

### Matrix cells not showing?
- Check that `cells` array has matching `conceptId` values
- Verify `action` is one of: 'CREATE', 'CONFIGURE', 'MONITOR'

### Drill-down not opening?
- Ensure `primingCard` has all 3 sections
- Check browser console for errors

### Styling looks off?
- Verify CSS modules are loading
- Check for conflicting global styles
- Ensure backdrop-filter is supported (modern browsers)

## 📚 Next Steps

1. Explore the Azure blueprint in `azure-blueprint.ts`
2. Read the full documentation in `README.md`
3. Create your own domain-specific matrix
4. Customize colors in CSS modules

## 💡 Pro Tips

- Use descriptive concept names (they appear in breadcrumbs)
- Keep atomic steps to 5-10 items for best cognitive load
- Write tricks as memorable patterns, not definitions
- List constraints in order of importance
- Test on mobile - the glassmorphism looks amazing on OLED screens!

---

**Ready to prime your learning?** Open the demo and start exploring! 🚀
