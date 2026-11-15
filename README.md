# Minus Wave List

Invited admins can sign in using **Admin access** above the level list. Signed-in admins can add levels there and add or remove completions by opening a player from the leaderboard. Changes are stored in Netlify Database and are visible to all visitors after loading the page. Existing leaderboard totals are retained as starting totals; newly listed completions add their level points without counting existing verifications twice.

## Grant admin access

In this project's Netlify dashboard, open **Identity**, invite each admin by email, and open their user detail page. Edit **Roles**, type `admin` (lowercase), confirm the entry with Enter, and save. Roles are custom text entries: `admin` is not a preset option and does not need to be created elsewhere first. The invitation link lets them set a password. Set registration to **Invite only** if all website accounts should require an invitation. Website accounts without the admin role cannot save changes. After assigning the role, have the person sign out of the website and sign back in, then open **Admin access** to check their permissions. The Admin access panel also supports password reset and sign-out.

## Development

Run `npm install`, then `netlify dev --port 8889`. Identity login requires the deployed site. Run `npm test` for validation, anonymous access, and page behavior checks. Netlify applies the generated database migration during deployment.
