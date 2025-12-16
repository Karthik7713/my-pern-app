Nav actions & icons

Files added/changed:
- `client/src/components/NavAction.jsx` - small reusable action button component
- `client/src/components/ProfileMenu.jsx` - small profile menu anchored to a button
- `client/src/components/Navbar.jsx` - updated to use action group instead of hamburger
- `client/src/index.css` - styles for action group, popover, and mobile drawer
- `client/package.json` - added `lucide-react` dependency

Icons
- Using `lucide-react` set: `List`, `BarChart2`, `Settings`, `User`.
- To install locally: from the `client` folder run:

  npm install lucide-react

How to test
- Build client:

  Set-Location -Path 'c:\Users\mkart\New folder\my-pern-app\client'
  npm run build

- Run server tests (server side):

  Set-Location -Path 'c:\Users\mkart\New folder\my-pern-app\server'
  npm test

Notes
- The new components are keyboard-accessible and include ARIA attributes.
- The Profile menu reuses `useAuth()` for logout so there is a single logout implementation.
- I added basic tests under `client/src/components/__tests__/Navbar.test.jsx` — they require the testing devDependencies (`vitest` / testing-library) to be installed already (they are present in `devDependencies`).
