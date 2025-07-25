<<<<<<< HEAD
## Overview

This project uses the following tech stack:
- Vite
- Typescript
- React Router v7 (all imports from `react-router` instead of `react-router-dom`)
- React 19 (for frontend components)
- Tailwind v4 (for styling)
- Shadcn UI (for UI components library)
- Lucide Icons (for icons)
- Convex (for backend & database)
- Convex Auth (for authentication)
- Framer Motion (for animations)

All relevant files live in the 'src' directory.

## Setup

This project is set up already and running on a cloud environment.

To set it up yourself:

1. Clone the repository
2. Run `pnpm install` to install the dependencies
3. Run `pnpm dev` to start the development server
4. Run `npx convex dev` to start the Convex development server

Running the convex development server is critical for ensuring the backend convex functions are correctly updating.

## Environment Variables

The project is set up with project specific CONVEX_DEPLOYMENT and VITE_CONVEX_URL environment variables on the client side.

The convex server has a separate set of environment variables that are accessible by the convex backend.

Currently, these variables include auth-specific keys: JWKS, JWT_PRIVATE_KEY, and SITE_URL.


# Using Authentication (Important!)

You must follow these conventions when using authentication.

## Auth is already set up.

All convex authentication functions are already set up. The auth uses email OTP and uses email OTP only.

The email OTP configuration is defined in `src/convex/auth/emailOtp.ts`. DO NOT MODIFY THIS FILE.

Other auth files you should not protect include: `src/convex/auth.config.ts` and `src/convex/auth.ts`.

## Using Convex Auth on the backend

On the `src/convex/users.ts` file, you can use the `getCurrentUser` function to get the current user's data.

```typescript
import { getAuthUserId } from "@convex-dev/auth/server";

export const getCurrentUser = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }
  return await ctx.db.get(userId);
}
```

To use this function, import this function and pass in the context object of a convex function.

```typescript
import { getCurrentUser } from "@/convex/users";

// Note: this function already exists in the `src/convex/users.ts` file.
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if(user === null) {
      return null;
    }

    // do something with the user data here

    return user;
  },
});
```

## Using Convex Auth on the frontend

Use the `useAuth` hook to get the current user's data, authentication state, and authentication actions on the frontend.

The `useAuth` hook is defined in `src/hooks/use-auth.ts`:

```typescript
// This file exists already in the `src/hooks/use-auth.ts` file.
import { api } from "@/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react"
import { useAuthActions } from "@convex-dev/auth/react"


export function useAuth() {
    const { isLoading, isAuthenticated } = useConvexAuth();
    const user = useQuery(api.users.currentUser);
    const { signIn, signOut } = useAuthActions();

    return {
        isLoading,
        isAuthenticated,
        user,
        signIn,
        signOut
    }
}
```

You MUST use this hook to get user data. Never do this yourself without the hook.

To use this hook, import it and call the function.

```typescript
import { useAuth } from "@/hooks/use-auth";

const { isLoading, isAuthenticated, user, signIn, signOut } = useAuth();
```

## Protected Routes

To protect a page component, wrap it in the `Protected` component imported from `@/lib/protected-page.tsx`. DO THIS IN `main.tsx` where the route is established. This will redirect the user to the auth page if they are not authenticated. THIS IS THE ONLY WAY YOU SHOULD PROTECT ROUTES.

Do not show anything else; always make sure to use the protected page lib.

## Auth Page

The auth page is defined in `src/pages/Auth.tsx`.


DO NOT USE THIS PAGE BY DEFAULT. Instead, you should use the `AuthButton` component defined in `src/components/auth/AuthButton.tsx`.

However, if you need to protect a route with authorization, redirect the user to the auth page.

The `AuthButton` component is a button that opens a modal for the user to sign in or sign up with the built-in email OTP.

The auth card located in `src/components/auth/AuthCard.tsx` is used to render the auth on the modal and on the Auth page.

## Using the AuthButton Component

The `AuthButton` component is defined in `src/components/auth/AuthButton.tsx`. It uses:

```typescript
interface AuthButtonProps {
  trigger?: React.ReactNode
  dashboardTrigger?: React.ReactNode
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  useModal?: boolean
}
```

The button comes in two states: Unauthenticated and Authenticated. It shows "Get Started" when the user is not authenticated, and shows "Dashboard" when the user is authenticated.

Trigger and DashboardTrigger allows you to replace the default Get Started and Dashboard buttons with your own buttons.

By default, the button opens a modal. Set the useModal prop to false to redirect the user to the auth page instead.

Example: 
```tsx
<AuthButton trigger={<Button size="lg">Get Started</Button>} dashboardTrigger={<Button size="lg"><Link to="/todos">Go To Your Todos</Link></Button>} />
```

Note: you may modify the auth button's default link on authenticated. By default, it is set to `/dashboard`. You can change this directly to redirect to the default dashboard page, or pass the trigger directly with the updated redirect.

## Authorization

You can perform authorization checks on the frontend and backend.

On the frontend, you can use the `useAuth` hook to get the current user's data and authentication state.

```tsx
import { useAuth } from "@/hooks/use-auth";
import { Spinner } from "@/components/ui/spinner";
import { AuthButton } from "@/components/auth/AuthButton";

export default function ExampleAuthorizedPage() {
  const { isLoading, isAuthenticated, user, signIn, signOut } = useAuth();
  
  // Handle loading state
  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Spinner className="h-12 w-12" />
        </div>
    );
  }
  
  // Handle unauthenticated state
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>You need to sign in to access this content</p>
        <AuthButton />
      </div>
    );
  }
  
  // Role-based authorization check
  if (!user || user.role !== "admin") {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Access denied: Admin privileges required</p>
        </div>
    );
  }
  
  // User is authenticated and authorized
  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <p>This is protected admin content</p>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
};
```

When writing pages, follow the same pattern:
- Use the `useAuth` hook to get the current user's data and authentication state as well as Auth actions
- Add a loading state using a spinner that is centered on the page
- If the user is not authenticated, show the AuthButton component to sign in.
- Check for the correct user role for Authorization on the page
- Render the content on the end

## Using the UserButton Component

For authenticated users, you can use the `UserButton` component to show a dropdown menu with the user's data and sign out button.

The `UserButton` component is defined in `src/components/auth/UserButton.tsx`.

It is a round display of the user's avatar with a fallback image.

When clicked, it shows a dropdown menu with the user's email and sign out button.

You can set the size of the button by passing in the `size` prop (default is 8).

DO NOT USE THIS COMPONENT. IT IS ALREADY IMPLEMENTED IN THE `src/components/protected/Sidebar.tsx` file on the navigation bar.

## Default Dashboard route

By default, the auth button and auth card will navigate to /dashboard.

Add core functionality for signed-in users to be at `/dashboard` under the `src/pages/Dashboard.tsx` component.

Remember to update this page with the starting functionality.


# Frontend Conventions

You will be using the Vite frontend with React 19, Tailwind v4, and Shadcn UI.

Generally, pages should be in the `src/pages` folder, and components should be in the `src/components` folder.

Shadcn primitives are located in the `src/components/ui` folder and should be used by default.

## Page routing

Your page component should go under the `src/pages` folder.

When adding a page, update the react router configuration in src/main.tsx to include the new route you just added.

## Shad CN conventions

Follow these conventions when using Shad CN components, which you should use by default.
- Remember to use "cursor-pointer" to make the element clickable
- For title text, use the "tracking-tight font-bold" class to make the text more readable
- Always make apps MOBILE RESPONSIVE. This is important
- AVOID NESTED CARDS. Try and not to nest cards, borders, components, etc. Nested cards add clutter and make the app look messy.
- AVOID SHADOWS. Avoid adding any shadows to components. stick with a thin border without the shadow.
- Avoid skeletons; instead, use the loader2 component to show a spinning loading state when loading data.

## Modifying the Primitive Shad CN Components App-wide

To implement app-wide primitive changes, you should modify the underlying shadcn primitive components located in `src/components/ui/` folder.

BE CAREFUL NOT TO BREAK THESE COMPONENTS. CHANGE AS LITTLE AS POSSIBLE WHEN EDITING.

However, make sure to modify the component itself for app-wide changes to primitive UI components and styling. Generally, try to override the default styles in-line instead of trying to modify the primitives.

## Landing Pages

You must always create good-looking designer-level styles to your application. For landing pages, avoid using Shad cn unless components are required.

- Make it a properly-styled good-looking landing page with fixed colors.
- Write it in raw tailwind without the use of shad cn
- Make it well animated and fit a certain "theme", ie modern, sleek, retro, neo brutalist, dark, light, saas, dev tool, etc.

Use known images from online; avoid using lorem picsum or other default images for these landing pages.

When working with the user, you can ask them to bring inspiration from another website they like to replicate their style.

## Responsiveness and formatting

Make sure pages are wrapped in a container to prevent the width stretching out on wide screens.

Always make sure that your designs are mobile responsive. Verify the formatting to ensure it has correct max and min widths as well as mobile responsiveness.

- Always create sidebars for protected dashboard pages and navigate between pages
- Always create navbars for landing pages
- These bars should have the user button, and the created logo should be clickable and redirect to the index page

## Animating with Framer Motion

You must add animations to components using Framer Motion. It is already installed and configured in the project.

To use it, import the `motion` component from `framer-motion` and use it to wrap the component you want to animate.

```tsx
import { motion } from "framer-motion";
```

### Animate Button Press
```tsx
<motion.div
        whileHover={{ scale: 1.05 }}
      >
    <Button>
        Animated Button Press
    </Button>
</motion.div>
```

### Animate On Page Load Slide In
```tsx
<motion.header 
      className="w-full py-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
    <div className="container">
      Content
    </div>
</motion.header>
```

### Other Items to animate
- Fade in and Fade Out
- Slide in and Slide Out animations
- Rendering animations

Animate for all components, including on landing page and app pages.

## Three JS Graphics

Your app comes with three js by default.


## Colors

You can override colors in: `src/index.css`

This uses the oklch color format for tailwind v4.

Here are the default colors in the file:
```css
:root {
    --radius: 0.625rem;
    --background: oklch(0.99 0.002 0);
    --foreground: oklch(0.145 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.145 0 0);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --primary-foreground: oklch(0.985 0 0);
    --secondary: oklch(0.97 0 0);
    --secondary-foreground: oklch(0.205 0 0);
    --muted: oklch(0.97 0 0);
    --muted-foreground: oklch(0.556 0 0);
    --accent: oklch(0.97 0 0);
    --accent-foreground: oklch(0.205 0 0);
    --destructive: oklch(0.577 0.245 27.325);
    --border: oklch(0.922 0 0);
    --input: oklch(0.922 0 0);
    --ring: oklch(0.708 0 0);
    --chart-1: oklch(0.646 0.222 41.116);
    --chart-2: oklch(0.6 0.118 184.704);
    --chart-3: oklch(0.398 0.07 227.392);
    --chart-4: oklch(0.828 0.189 84.429);
    --chart-5: oklch(0.769 0.188 70.08);
    --sidebar: oklch(0.985 0 0);
    --sidebar-foreground: oklch(0.145 0 0);
    --sidebar-primary: oklch(0.205 0 0);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.97 0 0);
    --sidebar-accent-foreground: oklch(0.205 0 0);
    --sidebar-border: oklch(0.922 0 0);
    --sidebar-ring: oklch(0.708 0 0);
  }
  
  .dark {
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.205 0 0);
    --card-foreground: oklch(0.985 0 0);
    --popover: oklch(0.205 0 0);
    --popover-foreground: oklch(0.985 0 0);
    --primary: oklch(0.922 0 0);
    --primary-foreground: oklch(0.205 0 0);
    --secondary: oklch(0.269 0 0);
    --secondary-foreground: oklch(0.985 0 0);
    --muted: oklch(0.269 0 0);
    --muted-foreground: oklch(0.708 0 0);
    --accent: oklch(0.269 0 0);
    --accent-foreground: oklch(0.985 0 0);
    --destructive: oklch(0.704 0.191 22.216);
    --border: oklch(1 0 0 / 10%);
    --input: oklch(1 0 0 / 15%);
    --ring: oklch(0.556 0 0);
    --chart-1: oklch(0.488 0.243 264.376);
    --chart-2: oklch(0.696 0.17 162.48);
    --chart-3: oklch(0.769 0.188 70.08);
    --chart-4: oklch(0.627 0.265 303.9);
    --chart-5: oklch(0.645 0.246 16.439);
    --sidebar: oklch(0.205 0 0);
    --sidebar-foreground: oklch(0.985 0 0);
    --sidebar-primary: oklch(0.488 0.243 264.376);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.269 0 0);
    --sidebar-accent-foreground: oklch(0.985 0 0);
    --sidebar-border: oklch(1 0 0 / 10%);
    --sidebar-ring: oklch(0.556 0 0);
  }
```

Try avoiding using colors for shad cn components (they already come with colors). However, use these color variable names when needed.

Make sure all ui components are set up to be mobile responsive and compatible with both light and dark mode.

Set theme using `dark` or `light` variables at the parent className.

## Toasts

You should always use toasts to display results to the user, such as confirmations, results, errors, etc.

Use the shad cn Sonner component as the toaster. For example:

```
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
export function SonnerDemo() {
  return (
    <Button
      variant="outline"
      onClick={() =>
        toast("Event has been created", {
          description: "Sunday, December 03, 2023 at 9:00 AM",
          action: {
            label: "Undo",
            onClick: () => console.log("Undo"),
          },
        })
      }
    >
      Show Toast
    </Button>
  )
}
```

Remember to import { toast } from "sonner". Usage: `toast("Event has been created.")`

## Dialogs

Always ensure your larger dialogs have a scroll in its content to ensure that its content fits the screen size. Make sure that the content is not cut off from the screen.

Ideally, instead of using a new page, use a Dialog instead. 

# Using the Convex backend

You will be implementing the convex backend. Follow your knowledge of convex and the documentation to implement the backend.

Convex documentation: https://docs.convex.dev/

## The Convex Schema

You must correctly follow the convex schema implementation.

The schema is defined in `src/convex/schema.ts`.

The schema is set up with the following defaults:

```typescript
import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
)
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema({
  // default auth tables using convex auth.
  ...authTables, // do not remove or modify

  // the users table is the default users table that is brought in by the authTables
  users: defineTable({
    name: v.optional(v.string()), // name of the user. do not remove
    image: v.optional(v.string()), // image of the user. do not remove
    email: v.optional(v.string()), // email of the user. do not remove
    emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
    isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove
    
    role: v.optional(roleValidator), // role of the user. do not remove
  })
    .index("email", ["email"]) // index for the email. do not remove or modify
  
  // add other tables here

  // tableName: defineTable({
  //   ...
  //   // table fields
  // }).index("by_field", ["field"])

},
{
  schemaValidation: false
});

export default schema;
```

Follow the conventions above. Remember to correctly index your tables. Do not include the `_id` and `_creationTime` fields in your queries (it is included by default for each table).


## Common Convex Mistakes To Avoid

When using convex, make sure:
- Document IDs are referenced as `_id` field, not `id`.
- Document ID types are referenced as `Id<"TableName">`, not `string`.
- Document object types are referenced as `Doc<"TableName">`.
- Keep schemaValidation to false in the schema file.
- You must correctly type your code so that it passes the type checker.
- You must handle null / undefined cases of your convex queries for both frontend and backend, or else it will throw an error that your data could be null or undefined.
- Always use the `@/folder` path, with `@/convex/folder/file.ts` syntax for importing convex files.
- This includes importing generated files like `@/convex/_generated/server`, `@/convex/_generated/api`
- Remember to import functions like useQuery, useMutation, useAction, etc. from `convex/react`
=======
# Kotech-hackathon


> This Mohammed Anfas K P
> Muhammed jasir E
>>>>>>> 2a5fd6dc8c51f95d666273fdb21ad4729e2da310
